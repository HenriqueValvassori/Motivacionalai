// netlify/functions/get-youtube-videos.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const fetch = require('node-fetch').default;

// --- SUBSTITUA AS LINHAS DO FAUNADB PELAS DO SUPABASE ---
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase; // Declarar fora para reuso em cold starts

try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas.');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Cliente Supabase inicializado com sucesso.');
} catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error.message);
    // Em produção, você pode querer retornar um erro 500 aqui se o Supabase for crítico.
    // Por enquanto, apenas logamos o erro.
}


const CACHE_TABLE_NAME = 'youtube_cache'; // Nome da tabela que você criou no Supabase
const CACHE_DOC_ID = 'main_youtube_videos'; // ID fixo para o registro de cache
const CACHE_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias em milissegundos

// Funções auxiliares para cache com Supabase
async function getCachedVideos() {
    if (!supabase) {
        console.error('Supabase client não está disponível. Pulando cache de leitura.');
        return null; // Não pode usar o cache se o cliente não inicializou
    }
    try {
        const { data, error } = await supabase
            .from(CACHE_TABLE_NAME)
            .select('data, timestamp')
            .eq('id', CACHE_DOC_ID)
            .single(); // Espera um único registro

        if (error && error.code === 'PGRST116') { // PGRST116 = No rows found (nenhum registro encontrado)
            console.log('Documento de cache não encontrado no Supabase.');
            return null;
        }
        if (error) {
            console.error('Erro ao ler cache do Supabase:', error.message);
            return null;
        }

        if (data && data.timestamp) {
            if (Date.now() - data.timestamp < CACHE_DURATION_MS) {
                console.log('Servindo vídeos do cache do Supabase.');
                return data.data; // Retorna apenas os dados do vídeo
            }
            console.log('Cache do Supabase expirado.');
            return null; // Cache expirado
        }
        console.log('Dados de cache inválidos no Supabase (sem timestamp ou data).');
        return null;
    } catch (error) {
        console.error('Erro inesperado ao acessar cache do Supabase:', error);
        return null;
    }
}

async function setCachedVideos(dataToCache) {
    if (!supabase) {
        console.error('Supabase client não está disponível. Pulando cache de escrita.');
        return;
    }
    try {
        const { error } = await supabase
            .from(CACHE_TABLE_NAME)
            .upsert({ 
                id: CACHE_DOC_ID, 
                data: dataToCache, 
                timestamp: Date.now() 
            }, { 
                onConflict: 'id' // Atualiza se 'id' já existe, insere se não
            });

        if (error) {
            console.error('Erro ao escrever cache no Supabase:', error.message);
        } else {
            console.log('Vídeos atualizados e salvos no cache do Supabase.');
        }
    } catch (error) {
        console.error('Erro inesperado ao escrever cache no Supabase:', error);
    }
}
// --- FIM DAS LINHAS DE CACHE COM SUPABASE ---


exports.handler = async (event, context) => {
    const YOUTUBE_API_KEY = process.env.API_YOUTUBE; 
    const CHANNEL_ID = process.env.CHANNEL_ID; 

    const MAX_RESULTS = 15; 

    if (!YOUTUBE_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Chave da API do YouTube não configurada.' })
        };
    }
    if (!CHANNEL_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'ID do Canal do YouTube não configurado na função get-youtube-videos.' })
        };
    }

    // Configuração de CORS (importante para chamadas de frontend)
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Permite qualquer origem. Ajuste para domínios específicos em produção!
        'Cache-Control': `public, max-age=${CACHE_DURATION_MS / 1000}` // Cache no navegador/CDN por 2 dias
    };

    try {
        // 1. Tentar obter dados do cache antes de chamar a API
        const cachedVideos = await getCachedVideos();
        if (cachedVideos) {
            return {
                statusCode: 200,
                body: JSON.stringify({ regularVideos: cachedVideos }),
                headers: headers // Usa os headers definidos acima
            };
        }

        // --- Se o cache não for válido ou não existir, proceder com a chamada da API ---
        console.log('Cache expirado ou não existente, buscando novos vídeos da API do YouTube.');

        // 1. Buscar os últimos vídeos do canal (IDs e Snippets)
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&type=video&maxResults=${MAX_RESULTS}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            console.error(`Youtube API Error: ${searchResponse.status} - ${searchResponse.statusText}`);
            const errorBody = await searchResponse.text();
            console.error('Youtube API Error Body:', errorBody);
            throw new Error(`Erro na busca de vídeos do YouTube: ${searchResponse.statusText}. Detalhes: ${errorBody}`);
        }
        const searchData = await searchResponse.json();

        const videoIds = searchData.items
            .filter(item => item.id.kind === 'youtube#video')
            .map(item => item.id.videoId);

        if (videoIds.length === 0) {
            // Se não encontrar vídeos, ainda assim armazenar um cache vazio para evitar chamadas repetidas
            await setCachedVideos([]); 
            return {
                statusCode: 200,
                body: JSON.stringify({ regularVideos: [] }),
                headers: headers // Usa os headers definidos acima
            };
        }

        // 2. Usar os IDs para buscar os detalhes dos vídeos (incluindo duração)
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds.join(',')}&part=contentDetails,snippet`;
        const videosResponse = await fetch(videosUrl);
        if (!videosResponse.ok) {
            console.error(`YouTube Videos API Error: ${videosResponse.status} - ${videosResponse.statusText}`);
            const errorBody = await videosResponse.text();
            console.error('YouTube Videos API Error Body:', errorBody);
            throw new Error(`Erro ao buscar detalhes dos vídeos do YouTube: ${videosResponse.statusText}. Detalhes: ${errorBody}`);
        }
        const videosData = await videosResponse.json();

        const allVideos = videosData.items.map(video => {
            const duration = video.contentDetails.duration; 
            const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            let totalSeconds = 0;
            if (durationMatch && durationMatch[1]) totalSeconds += parseInt(durationMatch[1]) * 3600;
            if (durationMatch && durationMatch[2]) totalSeconds += parseInt(durationMatch[2]) * 60;
            if (durationMatch && durationMatch[3]) totalSeconds += parseInt(durationMatch[3]);

            const isShort = totalSeconds <= 65; 

            return {
                id: video.id,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.medium.url,
                duration: totalSeconds,
                isShort: isShort
            };
        });

        const regularVideos = allVideos.filter(v => !v.isShort);

        // 3. Salvar os novos dados no cache antes de retornar
        await setCachedVideos(regularVideos); 

        return {
            statusCode: 200,
            body: JSON.stringify({ regularVideos }),
            headers: headers // Usa os headers definidos acima
        };

    } catch (error) {
        console.error('Erro na função get-youtube-videos:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Erro desconhecido ao buscar vídeos do YouTube.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
};