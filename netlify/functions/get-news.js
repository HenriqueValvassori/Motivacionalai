// netlify/functions/generate-news.js
const fetch = require('node-fetch');
const { Client } = require('pg');

exports.handler = async (event, context) => {
    const MISTRAL_API_KEY = process.env.GEMINI_API_KEY;
    const DATABASE_URL = process.env.NETLIFY_DATABASE_URL;

    if (!MISTRAL_API_KEY || !DATABASE_URL) {
        console.error("Erro: Variáveis de ambiente MISTRAL_API_KEY ou DATABASE_URL não configuradas.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente ausentes.' })
        };
    }

    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Use para Supabase/Neon, ajuste se seu provedor exigir certificado
        }
    });

    try {
        await pgClient.connect();

        // 1. Verificar a última geração
        const queryLastNews = 'SELECT data_geracao FROM noticias ORDER BY data_geracao DESC LIMIT 1;';
        const resLastNews = await pgClient.query(queryLastNews);

        let canGenerate = true;
        if (resLastNews.rows.length > 0) {
            const lastGenerationTime = new Date(resLastNews.rows[0].data_geracao);
            const now = new Date();
            const hoursSinceLastGeneration = (now.getTime() - lastGenerationTime.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastGeneration < 24) {
                canGenerate = false;
                console.log(`Notícia já gerada há ${hoursSinceLastGeneration.toFixed(2)} horas. Próxima geração em ${(24 - hoursSinceLastGeneration).toFixed(2)} horas.`);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Notícia não gerada. Intervalo de 24h não atingido.', lastGenerated: lastGenerationTime.toISOString() })
                };
            }
        }

        if (canGenerate) {
            // 2. Gerar a notícia com Mistral AI
            const prompt = `Crie uma notícia fictícia e interessante com cerca de 30 linhas sobre um evento inesperado e positivo. Dê um título cativante. Exemplo de tema: "Descoberta surpreendente em projeto de conservação marinha".`;

            const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'mistral-tiny', // Você pode experimentar com 'mistral-small' ou 'mistral-medium'
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 500 // Ajuste para 30 linhas, pode ser mais ou menos tokens
                })
            });

            if (!mistralResponse.ok) {
                const errorBody = await mistralResponse.json();
                console.error('Erro ao chamar Mistral AI:', errorBody);
                throw new Error(`Erro da API Mistral: ${mistralResponse.status} - ${errorBody.message || JSON.stringify(errorBody)}`);
            }

            const data = await mistralResponse.json();
            const generatedContent = data.choices[0].message.content.trim();

            // Extrair título (assumindo que o primeiro parágrafo ou linha é o título)
            const lines = generatedContent.split('\n');
            const title = lines[0].trim();
            const contentBody = lines.slice(1).join('\n').trim();

            // 3. Salvar no Banco de Dados
            const queryInsertNews = `
                INSERT INTO noticias (titulo, conteudo)
                VALUES ($1, $2)
                RETURNING id, titulo, data_geracao;
            `;
            const resInsertNews = await pgClient.query(queryInsertNews, [title, contentBody]);
            const newNews = resInsertNews.rows[0];

            console.log('Notícia gerada e salva:', newNews);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Notícia gerada e salva com sucesso!',
                    news: newNews
                })
            };
        }

    } catch (error) {
        console.error('Erro na função generate-news:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro interno: ${error.message}` })
        };
    } finally {
        await pgClient.end(); // Fechar a conexão com o banco
    }
};

