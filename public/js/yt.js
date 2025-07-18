
    require('dotenv').config();
    document.addEventListener('DOMContentLoaded', () => {
        // Sua chave da API do YouTube.
        // **ATENÇÃO:** Expor a chave da API diretamente no frontend não é recomendado para produção.
        // Considere usar uma função Netlify para proxy esta chamada.
        const YOUTUBE_API_KEY = 'API_YOUTUBE';
    
        // Seleciona todos os iframes do YouTube que estão dentro de um container
        const videoContainers = document.querySelectorAll('.video-container');
    
        videoContainers.forEach(container => {
            const iframe = container.querySelector('iframe');
            if (!iframe) return;
    
            // Extrai o ID do vídeo da URL do iframe
            const url = iframe.src;
            let videoId;
    
            // Tenta extrair o ID de diferentes formatos de URL do YouTube
            const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
            if (match && match[1]) {
                videoId = match[1];
            } else {
                console.warn('Não foi possível extrair o ID do vídeo da URL:', url);
                return; // Pula para o próximo container se o ID não for encontrado
            }
    
            // Faz a chamada à API do YouTube para obter detalhes do vídeo
            fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${API_YOUTUBE}&part=contentDetails,snippet`)
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
    
                        // Lógica para determinar se é um Short (duração curta, geralmente < 60 segundos)
                        // Esta é uma heurística, o YouTube não fornece uma flag direta para "Shorts" via API de dados.
                        // A duração é a forma mais confiável de inferir.
                        // Exemplo: PT1M30S (1 minuto e 30 segundos)
                        // Parse a duração ISO 8601 para segundos
                        const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                        let totalSeconds = 0;
                        if (durationMatch[1]) totalSeconds += parseInt(durationMatch[1]) * 3600;
                        if (durationMatch[2]) totalSeconds += parseInt(durationMatch[2]) * 60;
                        if (durationMatch[3]) totalSeconds += parseInt(durationMatch[3]);
    
                        // Shorts geralmente têm até 60 segundos (ou um pouco mais, dependendo da plataforma)
                        // Você pode ajustar este limite conforme sua preferência
                        const isShort = totalSeconds <= 65; // Um pouco mais de 60s para margem de erro
    
                        if (isShort) {
                            container.classList.add('aspect-ratio-9x16');
                            container.classList.remove('aspect-ratio-16x9');
                            console.log(`Vídeo "${title}" (ID: ${videoId}) detectado como Short. Aplicando 9:16.`);
                        } else {
                            container.classList.add('aspect-ratio-16x9');
                            container.classList.remove('aspect-ratio-9x16');
                            console.log(`Vídeo "${title}" (ID: ${videoId}) detectado como vídeo normal. Aplicando 16:9.`);
                        }
                    } else {
                        console.warn('Nenhum dado de vídeo encontrado para o ID:', videoId);
                    }
                })
                .catch(error => {
                    console.error('Erro ao buscar detalhes do vídeo do YouTube:', error);
                });
        });
    });
   