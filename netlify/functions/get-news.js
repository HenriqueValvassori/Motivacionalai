// netlify/functions/get-news.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    const DATABASE_URL = process.env.NETLIFY_DATABASE_URL; // Confirme este nome!

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
            rejectUnauthorized: false // Importante para provedores como Supabase/Neon
        }
    });

    try {
        await pgClient.connect();
        console.log('Conectado ao banco de dados.'); // Adicionei este log

        const queryText = 'SELECT titulo, conteudo, data_geracao FROM noticias ORDER BY data_geracao DESC;';
        const res = await pgClient.query(queryText);

        if (res.rows.length > 0) {
            const allNews = res.rows; // Pega todas as notícias
            console.log('Notícias encontradas:', allNews.length);
            return {
                statusCode: 200,
                body: JSON.stringify(allNews) // Retorna um array de notícias
            };
        
        } else {
            console.log('Nenhuma notícia encontrada no banco de dados.'); // Adicionei este log
            return {
                statusCode: 404, // Retorna 404 se não houver notícias
                body: JSON.stringify({ error: 'Nenhuma notícia encontrada no banco de dados.' })
            };
        }
    } catch (error) {
        console.error('Erro na função get-news:', error); // Melhor mensagem de erro
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro ao carregar notícia: ${error.message}` })
        };
    } finally {
        await pgClient.end(); // Fechar a conexão
    }
};