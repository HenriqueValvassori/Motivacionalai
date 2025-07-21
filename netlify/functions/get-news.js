// netlify/functions/get-news.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    const DATABASE_URL = process.env.NETLIFY_DATABASE_URL; // Confirme o nome da variável

    if (!DATABASE_URL) {
        console.error("Erro: Variável de ambiente DATABASE_URL não configurada.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variável de ambiente DATABASE_URL ausente.' })
        };
    }

    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await pgClient.connect();
        console.log('Conectado ao banco de dados para notícias.');

        // ATENÇÃO AQUI: Sem LIMIT 1, para pegar todas as notícias
        const queryText = 'SELECT titulo, conteudo, data_geracao FROM noticias ORDER BY data_geracao DESC;';
        const res = await pgClient.query(queryText);

        if (res.rows.length > 0) {
            const allNews = res.rows; // Retorna todas as linhas (um array)
            console.log('Notícias encontradas:', allNews.length);
            return {
                statusCode: 200,
                body: JSON.stringify(allNews) // Retorna o array de notícias
            };
        } else {
            console.log('Nenhuma notícia encontrada no banco de dados.');
            return {
                statusCode: 404, // Retorna 404 se não houver notícias
                body: JSON.stringify({ error: 'Nenhuma notícia encontrada no banco de dados.' })
            };
        }
    } catch (error) {
        console.error('Erro na função get-news:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro ao carregar notícias: ${error.message}` })
        };
    } finally {
        await pgClient.end();
    }
};