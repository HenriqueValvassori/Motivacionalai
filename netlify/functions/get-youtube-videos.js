// netlify/functions/get-youtube-videos.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const fetch = require('node-fetch');

// --- ADICIONE ESTAS LINHAS PARA O CACHE COM FAUNADB ---
const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

const CACHE_COLLECTION_NAME = 'youtube_cache';
const CACHE_DOC_ID = 'main_youtube_videos'; // ID fixo para o documento de cache
const CACHE_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias em milissegundos

// Funções auxiliares para cache
async function getCachedVideos() {
    try {
        const doc = await client.query(
            q.Get(q.Ref(q.Collection(CACHE_COLLECTION_NAME), CACHE_DOC_ID))
        );
        const { data, timestamp } = doc.data; // Desestrutura para obter os dados e o timestamp

        if (Date.now() - timestamp < CACHE_DURATION_MS) {
            console.log('Servindo vídeos do cache do FaunaDB.');
            return data;
        }
        console.log('Cache do FaunaDB expirado.');
        return null; // Cache expirado
    } catch (error) {
        if (error.name === 'NotFound') {
            console.log('Documento de cache não encontrado no FaunaDB.');
            return null; // Documento de cache não existe
        }
        console.error('Erro ao ler cache do FaunaDB:', error);
        return null;
    }
}

async function setCachedVideos(dataToCache) { // Renomeado para dataToCache para evitar conflito
    try {
        await client.query(
            q.If(
                q.Exists(q.Ref(q.Collection(CACHE_COLLECTION_NAME), CACHE_DOC_ID)),
                q.Replace(
                    q.Ref(q.Collection(CACHE_COLLECTION_NAME), CACHE_DOC_ID),
                    { data: { data: dataToCache, timestamp: Date.now() } } // Armazena os dados e o timestamp atual
                ),
                q.Create(
                    q.Ref(q.Collection(CACHE_COLLECTION_NAME), CACHE_DOC_ID),
                    { data: { data: dataToCache, timestamp: Date.now() } }
                )
            )
        );
        console.log('Vídeos atualizados e salvos no cache do FaunaDB.');
    } catch (error) {
        console.error('Erro ao escrever cache no FaunaDB:', error);
    }
}
// --- FIM DAS LINHAS DE CACHE ---


exports.handler = async (event, context) => {
    const YOUTUBE_API_KEY = process.env.API_YOUTUBE; 
    const CHANNEL_ID = 'UCM8vmU13i3wdC6qosu-Dmdw'; 

    const MAX_RESULTS = 15; 

    if (!YOUTUBE_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Chave da API do YouTube não configurada.' })
        };
    }
    if (!CHANNEL_ID) { // Esta verificação agora está boa
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'ID do Canal do YouTube não configurado na função get-youtube-videos.' })
        };
    }

    try {
        // 1. Tentar obter dados do cache antes de chamar a API
        const cachedVideos = await getCachedVideos();
        if (cachedVideos) {
            return {
                statusCode: 200,
                body: JSON.stringify({ regularVideos: cachedVideos }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': `public, max-age=${CACHE_DURATION_MS / 1000}` // Cache no navegador/CDN por 2 dias
                }
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
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': `public, max-age=${CACHE_DURATION_MS / 1000}` // Cache no navegador/CDN
            }
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