// netlify/functions/generate-free-image.js
// netlify/functions/generate-replicate-image.js

// Carrega variáveis de ambiente para teste local (útil com netlify-cli)
require('dotenv').config(); 

// Importa o módulo Replicate
// IMPORTANTE: Para usar 'import' em uma Netlify Function (Node.js),
// pode ser necessário adicionar "type": "module" ao seu package.json,
// ou garantir que seu ambiente Node.js no Netlify suporte ES Modules.
// Se tiver problemas de 'import' não definido, tente:
// const Replicate = require('replicate');
import Replicate from "replicate"; 

exports.handler = async (event, context) => {
    // 1. Obtenha o token da API Replicate da variável de ambiente do Netlify.
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN; 
    
    // Inicializa o cliente Replicate com o token
    // Movemos a inicialização do 'replicate' para cá, após obter o token.
    if (!REPLICATE_API_TOKEN) {
        console.error("Erro: REPLICATE_API_TOKEN não configurado nas variáveis de ambiente.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Token da API Replicate não configurado. Por favor, adicione-o nas variáveis de ambiente do Netlify.' })
        };
    }
    const replicate = new Replicate({
        auth: REPLICATE_API_TOKEN,
    });

    // 2. Verifique se o método da requisição é POST.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido. Use POST.' }),
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

    // Extrai o prompt e o aspect_ratio do corpo da requisição
    const { prompt, aspect_ratio } = requestBody;

    // 3. Valide o prompt.
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'O "prompt" é obrigatório e deve ser uma string não vazia.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    // --- CONFIGURAÇÃO E CHAMADA PARA A API REPLICATE (google/imagen-4-fast) ---
    const input = {
        prompt: prompt,
        // O 'aspect_ratio' é opcional no frontend. Se não for fornecido, usa "1:1" como padrão.
        aspect_ratio: aspect_ratio || "1:1" 
        // Adicione outros parâmetros para o modelo 'google/imagen-4-fast' aqui, se necessário.
        // Consulte a página do modelo na Replicate para ver todas as opções de input.
    };

    try {
        console.log(`Enviando prompt para Replicate (google/imagen-4-fast): "${prompt}"`);

        // A biblioteca 'replicate' cuida da chamada, autenticação e polling automaticamente.
        const output = await replicate.run(
            "google/imagen-4-fast", // ID do modelo na Replicate
            { input } // Objeto de input para o modelo
        );

        // O 'output' retornado pela biblioteca 'replicate' para modelos de imagem geralmente é uma URL.
        // Se for um array de URLs, pegamos a primeira. Se for uma string direta, usamos.
        let imageUrl = null;
        if (Array.isArray(output) && output.length > 0) {
            imageUrl = output[0]; // Pega a primeira URL se for um array
        } else if (typeof output === 'string') {
            imageUrl = output; // Se já for a URL como string
        } else {
            console.error("Formato de saída inesperado da Replicate:", output);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Formato de saída do modelo Replicate inesperado. Não foi possível obter a URL da imagem." })
            };
        }

        if (!imageUrl) {
             return {
                statusCode: 500,
                body: JSON.stringify({ error: "Nenhuma URL de imagem válida foi gerada pela Replicate." })
            };
        }

        console.log("Imagem gerada com sucesso pela Replicate. URL:", imageUrl);

        return {
            statusCode: 200,
            body: JSON.stringify({ imageUrl: imageUrl }), // Retorna a URL da imagem
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        console.error('Erro na função Netlify generate-replicate-image:', error);
        // A biblioteca 'replicate' geralmente fornece mensagens de erro claras.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro interno ao gerar imagem com Replicate: ${error.message}` })
        };
    }
};