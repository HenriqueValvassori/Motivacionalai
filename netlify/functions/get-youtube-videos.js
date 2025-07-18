// netlify/functions/get-youtube-videos.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const fetch = require('node-fetch'); // Ou axios, se preferir

exports.handler = async (event, context) => {
    const YOUTUBE_API_KEY = process.env.API_YOUTUBE; // Sua chave da API do YouTube do Netlify
    const CHANNEL_ID = 'SEU_CANAL_ID_AQUI'; // <-- Mude para o ID do seu canal do YouTube
    const MAX_RESULTS = 15; // Aumentado para garantir mais vídeos longos, se necessário

    if (!YOUTUBE_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Chave da API do YouTube não configurada.' })
        };
    }
    if (!CHANNEL_ID || CHANNEL_ID === 'SEU_CANAL_ID_AQUI') {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'ID do Canal do YouTube não configurado na função get-youtube-videos.' })
        };
    }

    try {
        // 1. Buscar os últimos vídeos do canal (IDs e Snippets)
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&type=video&maxResults=${MAX_RESULTS}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            throw new Error(`Erro na busca de vídeos do YouTube: ${searchResponse.statusText}`);
        }
        const searchData = await searchResponse.json();

        const videoIds = searchData.items
            .filter(item => item.id.kind === 'youtube#video')
            .map(item => item.id.videoId);

        if (videoIds.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ videos: [] }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            };
        }

        // 2. Usar os IDs para buscar os detalhes dos vídeos (incluindo duração)
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds.join(',')}&part=contentDetails,snippet`;
        const videosResponse = await fetch(videosUrl);
        if (!videosResponse.ok) {
            throw new Error(`Erro ao buscar detalhes dos vídeos do YouTube: ${videosResponse.statusText}`);
        }
        const videosData = await videosResponse.json();

        const allVideos = videosData.items.map(video => {
            const duration = video.contentDetails.duration; // Ex: PT1M30S
            const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            let totalSeconds = 0;
            if (durationMatch && durationMatch[1]) totalSeconds += parseInt(durationMatch[1]) * 3600;
            if (durationMatch && durationMatch[2]) totalSeconds += parseInt(durationMatch[2]) * 60;
            if (durationMatch && durationMatch[3]) totalSeconds += parseInt(durationMatch[3]);

            const isShort = totalSeconds <= 65; // Defina seu limite para Shorts (ex: 60-65 segundos)

            return {
                id: video.id,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.medium.url,
                duration: totalSeconds,
                isShort: isShort
            };
        });

        // Filtrar apenas os vídeos que NÃO são Shorts
        const regularVideos = allVideos.filter(v => !v.isShort);

        return {
            statusCode: 200,
            body: JSON.stringify({ regularVideos }), // Retorna apenas os vídeos regulares
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
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