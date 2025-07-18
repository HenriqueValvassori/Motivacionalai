// js/yt.js

// **ATENÇÃO:** Expor a chave da API diretamente no frontend NÃO É RECOMENDADO para produção.
// Considere usar uma função Netlify para proxy esta chamada à API do YouTube.
// Por exemplo: fetch('/.netlify/functions/get-youtube-video-info?videoId=' + videoId)
// e a função Netlify faria a chamada para a API do YouTube com sua chave segura.
// Por enquanto, usaremos um placeholder para demonstrar a estrutura.

// Você deve substituir 'YOUR_YOUTUBE_API_KEY_OR_PROXY_ENDPOINT_HERE' pelo ENDPOINT
// da sua função Netlify que faz a chamada à API do YouTube, ou se for para teste LOCAL
// e você estiver ciente dos riscos, coloque sua chave API_YOUTUBE diretamente aqui.
// EXEMPLO DE PROXY: const YOUTUBE_API_ENDPOINT = '/.netlify/functions/get-youtube-video-info?id=';
// EXEMPLO DIRETO (NÃO RECOMENDADO EM PRODUÇÃO): const YOUTUBE_API_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos?id=';
// Para fins de demonstração, vou assumir um endpoint de proxy ou que você colocaria a chave diretamente para teste.
const YOUTUBE_API_KEY_OR_PROXY_ENDPOINT = 'YOUR_YOUTUBE_API_KEY_GOES_HERE'; // <-- SUBSTITUA ISSO OU USE UM PROXY

document.addEventListener('DOMContentLoaded', () => {
    const videoContainers = document.querySelectorAll('.video-container');

    videoContainers.forEach(container => {
        const iframe = container.querySelector('iframe');
        if (!iframe) return;

        const url = iframe.src;
        let videoId;

        // Tenta extrair o ID do vídeo da URL do iframe
        // Suporta formatos como youtube.com/embed/, youtube.com/watch?v=, youtu.be/, youtube-nocookie.com/embed/, e shorts/
        const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        } else {
            console.warn('Não foi possível extrair o ID do vídeo da URL:', url);
            // Definir uma classe padrão ou remover o container se o ID for inválido
            container.classList.add('aspect-ratio-16x9'); // Padrão 16:9 se não conseguir determinar
            return; 
        }

        // Se você usar um PROXY Netlify para a API do YouTube, a URL seria algo como:
        // const fetchUrl = `/.netlify/functions/get-youtube-video-info?videoId=${videoId}`;
        // Se você optar por expor a chave (NÃO RECOMENDADO), seria:
        const fetchUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY_OR_PROXY_ENDPOINT}&part=contentDetails,snippet`;

        fetch(fetchUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na API do YouTube: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.items && data.items.length > 0) {
                    const video = data.items[0];
                    const duration = video.contentDetails.duration; // Duração em formato ISO 8601 (ex: PT1M30S)
                    const title = video.snippet.title;

                    const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                    let totalSeconds = 0;
                    if (durationMatch[1]) totalSeconds += parseInt(durationMatch[1]) * 3600;
                    if (durationMatch[2]) totalSeconds += parseInt(durationMatch[2]) * 60;
                    if (durationMatch[3]) totalSeconds += parseInt(durationMatch[3]);

                    // Heurística para Shorts: duração <= 65 segundos e, opcionalmente, proporção de aspecto (embora a API não forneça diretamente)
                    // No seu HTML, você já está definindo a classe `aspect-ratio-9x16` para os Shorts e `16x9` para vídeos.
                    // Este script pode ser usado para *validar* ou *ajustar* dinamicamente se necessário.
                    const isShort = totalSeconds <= 65; 

                    if (isShort) {
                        // Se você quiser que o script adicione a classe 9x16 dinamicamente com base na API
                        // container.classList.add('aspect-ratio-9x16');
                        // container.classList.remove('aspect-ratio-16x9');
                        console.log(`Vídeo "${title}" (ID: ${videoId}, Duração: ${totalSeconds}s) detectado como Short.`);
                    } else {
                        // container.classList.add('aspect-ratio-16x9');
                        // container.classList.remove('aspect-ratio-9x16');
                        console.log(`Vídeo "${title}" (ID: ${videoId}, Duração: ${totalSeconds}s) detectado como vídeo normal.`);
                    }
                } else {
                    console.warn('Nenhum dado de vídeo encontrado para o ID:', videoId);
                }
            })
            .catch(error => {
                console.error('Erro ao buscar detalhes do vídeo do YouTube:', error);
                // Em caso de erro na API, o vídeo ainda deve tentar carregar com a proporção definida no HTML.
            });
    });
});