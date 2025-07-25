// netlify/functions/generate-image-hf.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido.' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        const HF_API_TOKEN = process.env.HF_API_TOKEN;
        const MODEL_API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";

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
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            // Leia o corpo da resposta UMA ÚNICA VEZ
            let responseBody;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                responseBody = await response.json();
            } else {
                responseBody = await response.text();
            }

            console.error('Erro na API Hugging Face:', response.status, responseBody);

            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: (typeof responseBody === 'object' && responseBody.error) ? responseBody.error : String(responseBody),
                    details: responseBody
                })
            };
        }

        // Se a resposta for OK, ela é a imagem
        const imageBuffer = await response.buffer();
        const base64Image = imageBuffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg'; // Fallback

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