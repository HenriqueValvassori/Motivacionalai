// public/js/main-news.js
document.addEventListener('DOMContentLoaded', async () => {
    const newsTitleElement = document.getElementById('news-title'); // Este será o título da seção, não da notícia individual
    const newsContentElement = document.getElementById('news-content'); // Este será o container para todas as notícias
    const newsDateElement = document.getElementById('news-date'); // Este talvez não seja mais necessário aqui se você mostrar a data por notícia
    const errorMessageElement = document.getElementById('error-message');

    // Funções de carregamento/erro para o container principal
    newsContentElement.innerHTML = '<p>Carregando notícias...</p>';
    newsDateElement.textContent = ''; // Limpa a data genérica
    errorMessageElement.style.display = 'none';

    try {
        const response = await fetch('/.netlify/functions/get-news'); // Verifica o nome da função aqui!

        if (!response.ok) {
            const errorData = await response.json();
            // A função get-news.js retorna 404 se não houver notícias
            if (response.status === 404) {
                throw new Error("Nenhuma notícia encontrada no banco de dados.");
            }
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const allNews = await response.json(); // Agora esperamos um ARRAY de notícias

        if (allNews && Array.isArray(allNews) && allNews.length > 0) {
            newsContentElement.innerHTML = ''; // Limpa a mensagem "Carregando notícias..."

            // Itera sobre CADA notícia no array e cria um elemento para ela
            allNews.forEach(news => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item'; // Classe para estilização
                newsItem.innerHTML = `
                    <h3>${news.titulo}</h3>
                    <p>${news.conteudo.replace(/\n/g, '<br>')}</p>
                    <small>Publicado em: ${new Date(news.data_geracao).toLocaleDateString('pt-BR')} às ${new Date(news.data_geracao).toLocaleTimeString('pt-BR')}</small>
                    <hr> `;
                newsContentElement.appendChild(newsItem);
            });
            newsTitleElement.textContent = 'Todas as Notícias'; // Atualiza o título da seção
        } else {
            newsContentElement.innerHTML = '<p>Nenhuma notícia disponível no momento.</p><p>Por favor, volte mais tarde.</p>';
            errorMessageElement.textContent = 'Dados da notícia incompletos ou inexistentes.';
            errorMessageElement.style.display = 'block';
            newsTitleElement.textContent = 'Notícias'; // Volta para um título mais genérico
        }
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        newsContentElement.innerHTML = `<p>Não foi possível carregar as notícias no momento.</p>`;
        errorMessageElement.textContent = `Erro: ${error.message}`;
        errorMessageElement.style.display = 'block';
        newsTitleElement.textContent = 'Notícias';
    }
});