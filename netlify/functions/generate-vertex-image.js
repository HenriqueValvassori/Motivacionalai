// netlify/functions/generate-image-hf.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido.' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        const HF_API_TOKEN = process.env.HF_API_TOKEN;
        // SUBSTITUA 'sua-organizacao/seu-modelo' pela URL REAL do modelo no Hugging Face.
        // Verifique a página do modelo no Hugging Face para o endpoint correto.
        const MODEL_API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"; // Exemplo

        if (!HF_API_TOKEN) {
            return { statusCode: 500, body: 'Token da API Hugging Face não configurado.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Prompt não fornecido.' };
        }

        const response = await fetch(
            MODEL_API_URL,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_API_TOKEN}`,
                    "Content-Type": "application/json" // <<< ADICIONE/CORRIJA ESTA LINHA
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            let errorData;
            // Tente ler como JSON, mas caia para texto se falhar
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: await response.text() }; // Em caso de erro não JSON
            }
            console.error('Erro na API Hugging Face:', response.status, errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: errorData.error?.message || errorData.error || 'Erro ao chamar a API Hugging Face',
                    details: errorData
                })
            };
        }

        const imageBuffer = await response.buffer();
        const base64Image = imageBuffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg'; // Fallback para image/jpeg

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: `data:${contentType};base64,${base64Image}`,
                message: 'Imagem gerada com sucesso!'
            })
        };

    } catch (error) {
        console.error('Erro na função Netlify:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor.', details: error.message })
        };
    }
};