// js/motivation-app.js

document.addEventListener('DOMContentLoaded', async () => {
    const fraseMotivadoraElement = document.getElementById('fraseMotivadora');
    const trainingTipsElement = document.getElementById('trainingTipsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    const videosGallery = document.getElementById('videosGallery');

    // Função para buscar a frase motivacional
    async function fetchMotivationPhrase() {
        fraseMotivadoraElement.textContent = 'Carregando sua frase...';
        loadingMessage.style.display = 'block'; 
        errorMessage.style.display = 'none'; 
        try {
            const response = await fetch('/.netlify/functions/get-motivation');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            fraseMotivadoraElement.textContent = data.phrase || 'Não foi possível gerar a frase.';
        } catch (error) {
            console.error('Erro ao buscar frase motivacional:', error);
            fraseMotivadoraElement.textContent = 'Erro ao carregar a frase.';
            errorMessage.textContent = `Erro: ${error.message}`;
            errorMessage.style.display = 'block'; 
        } finally {
            loadingMessage.style.display = 'none'; 
        }
    }

    // Função para buscar as dicas de treino
    async function fetchTrainingTips() {
        trainingTipsElement.textContent = 'Carregando dicas de treino...';
        try {
            const response = await fetch('/.netlify/functions/get-training-tips');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            trainingTipsElement.textContent = data.tips || 'Não foi possível carregar as dicas de treino.';
        } catch (error) {
            console.error('Erro ao buscar dicas de treino:', error);
            trainingTipsElement.textContent = 'Erro ao carregar dicas de treino.';
        }
    }

    // Função para criar e adicionar um iframe de vídeo
    function createVideoEmbed(video, containerElement) {
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-container');
        videoContainer.classList.add('aspect-ratio-16x9'); // Sempre 16:9 para vídeos longos

        const iframe = document.createElement('iframe');
        iframe.setAttribute('width', '560'); // Largura padrão, será ajustada pelo CSS
        iframe.setAttribute('height', '315'); // Altura padrão, será ajustada pelo CSS
        // AQUI ESTÁ A CORREÇÃO DA URL DO YOUTUBE
        iframe.setAttribute('src', `https://www.youtube.com/embed/${video.id}`);
        iframe.setAttribute('title', video.title || 'Vídeo do YouTube');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('allowfullscreen', '');

        videoContainer.appendChild(iframe);
        containerElement.appendChild(videoContainer);
    }

    // Função para buscar e exibir os vídeos do YouTube
    async function fetchYouTubeVideos() {
        videosGallery.innerHTML = '<p class="loading-videos">Carregando Vídeos...</p>';
        try {
            const response = await fetch('/.netlify/functions/get-youtube-videos');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            const data = await response.json();

            videosGallery.innerHTML = ''; // Limpa o placeholder de carregamento

            if (data.regularVideos && data.regularVideos.length > 0) {
                data.regularVideos.forEach(video => createVideoEmbed(video, videosGallery));
            } else {
                videosGallery.innerHTML = '<p>Nenhum Vídeo longo encontrado.</p>';
            }

        } catch (error) {
            console.error('Erro ao buscar vídeos do YouTube:', error);
            videosGallery.innerHTML = `<p class="error">Erro ao carregar Vídeos: ${error.message}</p>`;
        }
    }

    // Chame todas as funções ao carregar a página
    fetchMotivationPhrase();
    fetchTrainingTips();
    fetchYouTubeVideos();
});