// netlify/functions/generate-gemini-prompt.js

// Importa a biblioteca do Google Generative AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configurações da API Gemini ---
// Sua Chave da API Gemini.
// No Netlify, configure isso em "Site settings" > "Build & deploy" > "Environment variables".
const API_KEY = process.env.GEMINI_API_KEY; 

// Inicializa o cliente Gemini
let genAI;
try {
    genAI = new GoogleGenerativeAI(API_KEY);
} catch (e) {
    console.error("Erro ao inicializar GoogleGenerativeAI:", e.message);
    // Este erro geralmente acontece se a API_KEY estiver faltando ou for inválida.
}

// O manipulador principal da sua Netlify Function
// É ESSENCIAL que seja 'exports.handler' e que receba 'event' e 'context'
exports.handler = async (event, context) => { // <-- MUDANÇA AQUI: exporta como 'handler' e usa 'event', 'context'
    // --- Configuração de CORS (Essencial para chamadas de frontend) ---
    // Netlify Functions geralmente cuidam de CORS para o mesmo domínio, mas é bom ter.
    // Para chamadas de outros domínios, você precisaria configurar os cabeçalhos.
    const headers = {
        'Access-Control-Allow-Origin': '*', // Ajuste para domínios específicos em produção!
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Lida com requisições OPTIONS (preflight CORS)
    if (event.httpMethod === 'OPTIONS') { // <-- MUDANÇA AQUI: usa event.httpMethod
        return {
            statusCode: 204,
            headers: headers,
            body: ''
        };
    }

    // --- Validação Inicial da API Key e Cliente ---
    if (!API_KEY) {
        console.error("Erro: GEMINI_API_KEY não configurado nas variáveis de ambiente do Netlify.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Chave da API Gemini não configurada. Por favor, adicione-a como variável de ambiente.' })
        };
    }
    if (!genAI) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Falha na inicialização do cliente da API Gemini. Verifique a chave da API.' })
        };
    }

    let requestBody;
    try {
        // Para Netlify Functions, o corpo da requisição POST vem como uma string no event.body e precisa ser parseado.
        requestBody = JSON.parse(event.body); // <-- MUDANÇA AQUI: usa event.body
    } catch (error) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Esperado JSON.' })
        };
    }

    // O prompt base que o usuário fornece (ex: "um gato espacial fofo")
    const { basePrompt } = requestBody; 

    if (!basePrompt || typeof basePrompt !== 'string' || basePrompt.trim() === '') {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'O "basePrompt" é obrigatório e deve ser uma string não vazia.' })
        };
    }

    try {
        // --- Usa o modelo Gemini Pro para gerar texto ---
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // "gemini-pro" é para geração de texto

        // Cria uma instrução para o Gemini gerar um prompt de imagem detalhado.
        const fullPrompt = `Gere um prompt altamente detalhado e criativo (no máximo 150 palavras) para uma IA de geração de imagens, baseado na seguinte ideia: "${basePrompt}". Inclua especificações de estilo artístico (ex: fotorrealista, cyberpunk, aquarela), cores predominantes, tipo de iluminação, composição da cena, e a descrição dos elementos principais.`;

        console.log(`[Netlify Function - Gemini] Solicitando ao Gemini para expandir o prompt: "${basePrompt}"`);
        
        // Faz a chamada à API Gemini
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const generatedImagePrompt = response.text(); // A saída do Gemini é texto!

        if (!generatedImagePrompt || generatedImagePrompt.trim() === '') {
            console.error("[Netlify Function - Gemini] Nenhuma descrição de imagem gerada pelo Gemini.");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ error: "O Gemini não conseguiu gerar uma descrição detalhada de imagem para o seu prompt." })
            };
        }

        console.log("[Netlify Function - Gemini] Descrição de imagem gerada com sucesso pelo Gemini.");
        
        // --- Retorna a DESCRIÇÃO DE TEXTO gerada pelo Gemini ---
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ detailedImagePrompt: generatedImagePrompt })
        };

    } catch (error) {
        console.error('[Netlify Function - Gemini] Erro ao chamar o modelo Gemini Pro:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: `Erro interno ao gerar prompt com Gemini: ${error.message}` })
        };
    }
};