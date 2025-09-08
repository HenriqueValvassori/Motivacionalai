// netlify/functions/generate-training-tips.js
const fetch = require('node-fetch');
const { Client } = require('pg');
exports.schedule = '@daily'; 
exports.handler = async (event, context) => {
    const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
    const DATABASE_URL = process.env.NETLIFY_DATABASE_URL;

    if (!GOOGLE_API_KEY || !DATABASE_URL) {
        console.error("Erro: Variáveis de ambiente GOOGLE_API_KEY ou DATABASE_URL não configuradas.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente ausentes.' })
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

        // 1. Verificar a última geração de dicas de treino
        const queryLastTip = 'SELECT data_geracao FROM dicas_treino ORDER BY data_geracao DESC LIMIT 1;';
        const resLastTip = await pgClient.query(queryLastTip);

        let canGenerate = true;
        if (resLastTip.rows.length > 0) {
            const lastGenerationTime = new Date(resLastTip.rows[0].data_geracao);
            const now = new Date();
            const hoursSinceLastGeneration = (now.getTime() - lastGenerationTime.getTime()) / (1000 * 60 * 60);

           if (hoursSinceLastGeneration < 24) {
                canGenerate = false;
                console.log(`Dica de treino já gerada há ${hoursSinceLastGeneration.toFixed(2)} horas. Próxima geração em ${(24 - hoursSinceLastGeneration).toFixed(2)} horas.`);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Dica de treino não gerada. Intervalo de 24h não atingido.', lastGenerated: lastGenerationTime.toISOString() })
                };
            }
        }

        if (canGenerate) {
            // 2. Gerar a dica de treino com Gemini Flash
            const prompt = `Crie uma dica de treino para iniciantes,sempre original e diferente do anterior, com novos temas de exercicos, nutricao.`;

            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.8, // Um pouco mais criativo
                        maxOutputTokens: 700 // Ajuste conforme a necessidade de parágrafos
                    }
                })
            });

            if (!geminiResponse.ok) {
                const errorBody = await geminiResponse.json();
                console.error('Erro ao chamar Gemini AI para dicas de treino:', errorBody);
                throw new Error(`Erro da API Gemini: ${geminiResponse.status} - ${errorBody.error.message || JSON.stringify(errorBody)}`);
            }

            const data = await geminiResponse.json();
            const generatedContent = data.candidates[0].content.parts[0].text.trim();

            const lines = generatedContent.split('\n');
            const title = lines[0].trim();
            const contentBody = lines.slice(1).join('\n').trim();

            // 3. Salvar no Banco de Dados
            const queryInsertTip = `
                INSERT INTO dicas_treino (titulo, conteudo)
                VALUES ($1, $2)
                RETURNING id, titulo, data_geracao;
            `;
            const resInsertTip = await pgClient.query(queryInsertTip, [title, contentBody]);
            const newTip = resInsertTip.rows[0];

            console.log('Dica de treino gerada e salva:', newTip);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Dica de treino gerada e salva com sucesso!',
                    tip: newTip
                })
            };
        }

    } catch (error) {
        console.error('Erro na função generate-training-tips:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro interno: ${error.message}` })
        };
    } finally {
        await pgClient.end();
    }
};