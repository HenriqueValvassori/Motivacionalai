// public/js/main-news.js
document.addEventListener('DOMContentLoaded', async () => {
    // newsTitleElement será o título da seção de notícias, como "Todas as Notícias"
    const newsTitleElement = document.getElementById('news-title'); 
    // newsContentElement será o contêiner onde as notícias individuais serão adicionadas
    const newsContentElement = document.getElementById('news-content'); 
    const errorMessageElement = document.getElementById('error-message');

    // Inicializa o estado de carregamento
    newsContentElement.innerHTML = '<p>Carregando notícias...</p>';
    if (errorMessageElement) {
        errorMessageElement.style.display = 'none';
    }
    
    // Opcional: Você pode querer remover ou redefinir news-date se ele não for mais global
    const newsDateElement = document.getElementById('news-date');
    if (newsDateElement) newsDateElement.textContent = ''; 

    try {
        // Confirma que a URL da função está correta
        const response = await fetch('/.netlify/functions/get-news'); 

        if (!response.ok) {
            // Tenta ler o erro do JSON, se disponível
            let errorDetails = `Erro HTTP: ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetails = errorData.error || errorDetails;
            } catch (e) {
                // Se a resposta não for JSON (ex: HTML de erro do Netlify), usa a mensagem padrão
                errorDetails = `Resposta do servidor não é JSON (HTTP ${response.status}).`;
            }

            // A função get-news.js retorna 404 se não houver notícias
            if (response.status === 404) {
                throw new Error("Nenhuma notícia encontrada no banco de dados.");
            }
            throw new Error(errorDetails);
        }

        // É crucial que a resposta seja parseada como JSON aqui
        const allNews = await response.json(); 

        // Verifica se é um array e se contém itens
        if (allNews && Array.isArray(allNews) && allNews.length > 0) {
            newsContentElement.innerHTML = ''; // Limpa a mensagem "Carregando notícias..."

            // Itera sobre CADA notícia no array para criar seus elementos HTML
            allNews.forEach(news => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item'; // Adicione uma classe CSS para estilização
                newsItem.innerHTML = `
                    <h3>${news.titulo}</h3>
                    <p>${news.conteudo.replace(/\n/g, '<br>')}</p>
                    <small>Publicado em: ${new Date(news.data_geracao).toLocaleDateString('pt-BR')} às ${new Date(news.data_geracao).toLocaleTimeString('pt-BR')}</small>
                    <hr> `;
                newsContentElement.appendChild(newsItem);
            });
            newsTitleElement.textContent = 'Todas as Notícias'; // Atualiza o título principal da seção
        } else {
            // Se o array estiver vazio ou não for um array válido
            newsContentElement.innerHTML = '<p>Nenhuma notícia disponível no momento.</p><p>Por favor, volte mais tarde.</p>';
            if (errorMessageElement) {
                errorMessageElement.textContent = 'Dados da notícia incompletos ou inexistentes.';
                errorMessageElement.style.display = 'block';
            }
            newsTitleElement.textContent = 'Notícias'; // Volta para um título mais genérico
        }
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        newsContentElement.innerHTML = `<p>Não foi possível carregar as notícias no momento.</p>`;
        if (errorMessageElement) {
            errorMessageElement.textContent = `Erro: ${error.message}`;
            errorMessageElement.style.display = 'block';
        }
        newsTitleElement.textContent = 'Notícias';
    }
});

// Este script também pode inicializar o ano atual no footer, se for o caso.
document.addEventListener('DOMContentLoaded', () => {
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});