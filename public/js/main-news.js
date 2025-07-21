document.addEventListener('DOMContentLoaded', async () => {
    const newsTitleElement = document.getElementById('news-title');
    const newsContentElement = document.getElementById('news-content');
    const newsDateElement = document.getElementById('news-date');
    const errorMessageElement = document.getElementById('error-message');
    const currentYearElement = document.getElementById('current-year');

    currentYearElement.textContent = new Date().getFullYear();

    // Função para buscar e exibir a notícia
    async function fetchAndDisplayNews() {
        newsTitleElement.textContent = 'Carregando notícia...';
        newsContentElement.innerHTML = '<p>Por favor, aguarde enquanto a notícia é carregada.</p>';
        newsDateElement.textContent = 'Última atualização: --/--/----';
        errorMessageElement.style.display = 'none';

        try {
            const response = await fetch('/.netlify/functions/get-news');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const newsData = await response.json();

            newsTitleElement.textContent = newsData.titulo;
            // O replace(/\n/g, '<br>') garante que as quebras de linha da IA sejam renderizadas no HTML
            newsContentElement.innerHTML = newsData.conteudo.replace(/\n/g, '<br>');

            const date = new Date(newsData.data_geracao);
            newsDateElement.textContent = `Última atualização: ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}`;

        } catch (error) {
            console.error('Erro ao buscar notícia:', error);
            newsTitleElement.textContent = 'Erro ao carregar notícia.';
            newsContentElement.innerHTML = `<p>Não foi possível carregar a notícia no momento.</p>`;
            errorMessageElement.textContent = `Erro: ${error.message}`;
            errorMessageElement.style.display = 'block';
        }
    }

    // Chamar a função para buscar a notícia na carga da página
    fetchAndDisplayNews();

    // Se quiser, pode adicionar um botão para gerar uma notícia manualmente (para testes)
    // Note que a função de generate-news ainda respeita o limite de 24h
    // const generateNewsButton = document.createElement('button');
    // generateNewsButton.textContent = 'Gerar Nova Notícia (apenas teste)';
    // generateNewsButton.addEventListener('click', async () => {
    //     try {
    //         const response = await fetch('/.netlify/functions/generate-news', { method: 'POST' });
    //         const result = await response.json();
    //         if (response.ok) {
    //             alert(result.message);
    //             fetchAndDisplayNews(); // Recarrega para mostrar a nova notícia
    //         } else {
    //             alert('Erro ao tentar gerar notícia: ' + result.error);
    //         }
    //     } catch (e) {
    //         alert('Erro de rede ao gerar notícia.');
    //     }
    // });
    // document.body.appendChild(generateNewsButton); // Adiciona o botão ao final do body
});