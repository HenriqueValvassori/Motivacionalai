document.addEventListener('DOMContentLoaded', async () => {
    const fraseMotivadoraElement = document.getElementById('fraseMotivadora');
    const trainingTipsElement = document.getElementById('trainingTipsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const videosGallery = document.getElementById('videosGallery');

    // Função utilitária para buscar dados de um URL e tratar erros
    async function fetchData(url, elementType) {
        try {
            const response = await fetch(url);

            // Se a resposta não for 200 OK, lançamos um erro
            if (!response.ok) {
                // Tenta ler o JSON de erro do corpo da resposta, se houver
                const errorData = await response.json().catch(() => ({}));
                const errorMessageText = errorData.error || `Erro HTTP: ${response.status} ao buscar o recurso.`;
                throw new Error(errorMessageText);
            }
            
            // Retorna os dados como JSON
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Erro ao buscar dados de ${url}:`, error);
            if (elementType) {
                elementType.textContent = `Ops! Erro ao carregar. Recarregue a página.`;
            }
            if (errorMessage) {
                errorMessage.textContent = `Detalhe do erro: ${error.message}`;
                errorMessage.style.display = 'block';
            }
            throw error; // Relança o erro para que o 'finally' seja executado
        }
    }

    // Função para buscar a frase motivacional
    async function fetchMotivationPhrase() {
        if (!fraseMotivadoraElement) return;

        fraseMotivadoraElement.textContent = 'Carregando sua frase...';
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';

        try {
            // **CORRIGIDO:** Alterado de /.netlify/functions para /api/
            const data = await fetchData('/api/get-motivation', fraseMotivadoraElement);
            if (data && data.phrase) {
                fraseMotivadoraElement.textContent = data.phrase;
            } else {
                throw new Error('Formato de dados da frase inesperado.');
            }
        } catch (error) {
            // O erro já foi tratado em fetchData(), nada mais a fazer aqui
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    // Função para buscar as dicas de treino
    async function fetchTrainingTips() {
        if (!trainingTipsElement) return;

        trainingTipsElement.textContent = 'Carregando dicas de treino...';
        try {
            // **CORRIGIDO:** Alterado de /.netlify/functions para /api/
            const data = await fetchData('/api/get-training-tips', trainingTipsElement);
            if (data && data.tips) {
                trainingTipsElement.textContent = data.tips;
            } else {
                throw new Error('Formato de dados das dicas inesperado.');
            }
        } catch (error) {
            // O erro já foi tratado em fetchData()
        }
    }

    // Função para buscar e exibir os vídeos do YouTube
    async function fetchYouTubeVideos() {
        if (!videosGallery) return;

        videosGallery.innerHTML = '<p class="loading-videos">Carregando Vídeos...</p>';
        try {
            // **CORRIGIDO:** Alterado de /.netlify/functions para /api/
            const data = await fetchData('/api/get-youtube-videos', videosGallery);

            videosGallery.innerHTML = ''; // Limpa o placeholder de carregamento

            if (data && data.regularVideos && data.regularVideos.length > 0) {
                data.regularVideos.forEach(video => createVideoEmbed(video, videosGallery));
            } else {
                videosGallery.innerHTML = '<p>Nenhum vídeo longo encontrado no momento. Volte mais tarde!</p>';
            }
        } catch (error) {
            // O erro já foi tratado em fetchData()
        }
    }
    
    // Função para criar e adicionar um iframe de vídeo (mantida a sua lógica original)
    function createVideoEmbed(video, containerElement) {
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-container', 'aspect-ratio-16x9');
        const iframe = document.createElement('iframe');
        iframe.setAttribute('width', '560');
        iframe.setAttribute('height', '315');
        iframe.setAttribute('src', `https://www.youtube.com/embed/${video.id}?rel=0`);
        iframe.setAttribute('title', video.title || 'Vídeo do YouTube');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');

        videoContainer.appendChild(iframe);
        containerElement.appendChild(videoContainer);
    }

    // Chame todas as funções ao carregar a página
    fetchMotivationPhrase();
    fetchTrainingTips();
    fetchYouTubeVideos();
});