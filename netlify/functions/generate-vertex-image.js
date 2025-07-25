// netlify/functions/generate-image-hf.js (ou o nome que preferir)
const fetch = require('node-fetch'); // Certifique-se de que 'node-fetch' está instalado (npm install node-fetch)

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido.' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        // Seu token de API do Hugging Face (MUITO IMPORTANTE: lido das variáveis de ambiente)
        const HF_API_TOKEN = process.env.HF_API_TOKEN;

        // URL do endpoint da Inference API para o modelo escolhido
        // SUBSTITUA 'sua-organizacao/seu-modelo' pela URL real do modelo no Hugging Face.
        // Exemplo para um modelo Stable Diffusion comum:
        const MODEL_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
        // Ou um modelo mais leve que pode ter inferência gratuita:
        // const MODEL_API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";


        if (!HF_API_TOKEN) {
            return { statusCode: 500, body: 'Token da API Hugging Face não configurado.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Prompt não fornecido.' };
        }

        const response = await fetch(
            MODEL_API_URL,
            {
                headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        // A resposta da Inference API é um Blob de imagem ou um JSON de erro
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na API Hugging Face:', errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorData.error || 'Erro ao chamar a API Hugging Face' })
            };
        }

        // Se a resposta for OK, ela é a imagem (provavelmente image/jpeg ou image/png)
        // Você precisará converter o blob da imagem para Base64 para retornar ao cliente.
        const imageBuffer = await response.buffer();
        const base64Image = imageBuffer.toString('base64');
        const contentType = response.headers.get('content-type'); // Pega o tipo de imagem (ex: image/jpeg)

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json' // Ou o tipo da imagem se for retornar direto
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