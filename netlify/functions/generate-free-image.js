// netlify/functions/generate-free-image.js
require('dotenv').config(); // Carrega variáveis de ambiente para teste local

const fetch = require('node-fetch'); // Usaremos 'node-fetch' para fazer a requisição HTTP

exports.handler = async (event, context) => {
    // 1. Obtenha a chave da API da variável de ambiente do Netlify.
    //    Substitua 'SUA_API_DE_IMAGEM_KEY' pelo nome da variável que você configurou no Netlify.
    const API_KEY = process.env.API_DE_IMAGEM_KEY; 

    // 2. Verifique se o método da requisição é POST.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido. Use POST.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    // 3. Verifique se a chave da API está configurada.
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Chave da API de Geração de Imagem não configurada.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Esperado JSON.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    const { prompt } = requestBody;

    // 4. Valide o prompt.
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'O "prompt" é obrigatório e deve ser uma string não vazia.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    // --- EXEMPLO DE CONFIGURAÇÃO PARA A API DE INFERÊNCIA DA HUGGING FACE (Stable Diffusion) ---
    // Você PRECISARÁ adaptar esta URL e o corpo da requisição para a API específica que for usar.
    // Visite o Hugging Face Hub, encontre um modelo Stable Diffusion (ex: stabilityai/stable-diffusion-2-1)
    // e clique em "Deploy" -> "Inference API" para ver a URL e o exemplo de código.
    const EXTERNAL_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1'; 
    const HEADERS = {
        'Authorization': `Bearer ${API_KEY}`, // Para Hugging Face, é 'Bearer Token'
        'Content-Type': 'application/json'
    };
    const BODY = JSON.stringify({
        inputs: prompt,
        options: {
            wait_for_model: true // Espera se o modelo estiver carregando
        }
    });

    try {
        console.log(`Enviando prompt para a API de IA: "${prompt}"`);

        const response = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: HEADERS,
            body: BODY
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text()); // Tenta ler JSON, senão texto
            console.error('Erro da API externa:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: `Erro ao gerar imagem: ${typeof errorBody === 'object' && errorBody.error ? errorBody.error : response.statusText}. Verifique sua cota ou limite de taxa.` 
                }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        // Para Hugging Face Inference API, a resposta é uma imagem em blob/arraybuffer, não uma URL.
        // Você precisará converter isso para uma base64 ou salvar em algum lugar e retornar a URL.
        // Para simplificar, vou assumir que a API retorna um JSON com a URL da imagem.
        // Se a API retornar um blob, você precisaria de um serviço de upload de imagens (como Cloudinary, S3).
        // EXEMPLO: se a API retornasse uma URL:
        // const data = await response.json();
        // const imageUrl = data.data[0].url; 

        // EXEMPLO ALTERNATIVO: Retornando a imagem como Base64 (se a API retornar um blob)
        // Isso aumenta o tamanho da resposta, mas evita a necessidade de um serviço de upload.
        const imageBlob = await response.buffer(); // response.arrayBuffer() no navegador, .buffer() no node-fetch
        const imageBase64 = `data:${response.headers.get('content-type')};base64,${imageBlob.toString('base64')}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ imageUrl: imageBase64 }), // Retorna a imagem em Base64
            // OU se a API te der uma URL: body: JSON.stringify({ imageUrl: imageUrl }),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        console.error('Erro na função Netlify generate-free-image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno ao gerar imagem.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};