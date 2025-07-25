// netlify/functions/generate-image-gemini-flash.js

/*const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Sua chave API do Google AI Studio

        if (!GEMINI_API_KEY) {
            return { statusCode: 500, body: 'Erro: Chave de API Gemini não configurada.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Erro: Prompt de imagem não fornecido.' };
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // O modelo "gemini-1.5-flash-latest" é multimodal, mas a geração de imagem direta como saída
        // de um prompt de texto puro PODE NÃO ser a funcionalidade principal ou o formato esperado.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // A estrutura da requisição para geração de conteúdo
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt }
                ]
            }],
            // Safety settings (ajuste conforme necessário)
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ],
            // As opções de geração (generationConfig) para imagem via generateContent
            // são limitadas. Modelos de imagem dedicados como Imagen têm mais controles.
        });

        const response = result.response;
        // console.log("Resposta bruta do Gemini Flash:", JSON.stringify(response, null, 2)); // Para depuração

        // Tentar encontrar uma imagem na resposta
        let imageUrl = null;
        let imageMimeType = null;

        if (response.candidates && response.candidates.length > 0) {
            const parts = response.candidates[0].content.parts;
            for (const part of parts) {
                // A Google API retorna dados de imagem como 'inlineData' ou 'fileData' em 'parts'
                if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
                    // Esta é a forma mais provável de uma imagem Base64 ser retornada
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    imageMimeType = part.inlineData.mimeType;
                    break;
                }
                // Se o modelo gerar um URL temporário para o arquivo:
                else if (part.fileData && part.fileData.fileUri && part.fileData.mimeType) {
                    // Isso é menos provável para geração direta, mais para entrada ou arquivos grandes
                    imageUrl = part.fileData.fileUri; // Isso seria um URL, não uma Data URL Base64
                    imageMimeType = part.fileData.mimeType;
                    break;
                }
            }
        }

        if (imageUrl) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageUrl,
                    mimeType: imageMimeType,
                    message: 'Imagem gerada com Gemini Flash (Experimental)!'
                })
            };
        } else {
            console.error('Gemini Flash: Resposta não continha imagem no formato esperado.');
            console.error('Resposta bruta:', JSON.stringify(response, null, 2));
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Gemini Flash: Não foi possível extrair a imagem da resposta. O modelo pode não suportar geração de imagem direta com este endpoint.',
                    details: JSON.stringify(response.text()) || "Nenhum texto na resposta."
                })
            };
        }

    } catch (error) {
        console.error('Erro na função Netlify (Gemini Flash):', error);
        let errorMessage = 'Erro interno do servidor.';
        if (error.message.includes('Quota exceeded')) {
            errorMessage = 'Cota da API Gemini excedida. Tente novamente mais tarde.';
        } else if (error.message.includes('BLOCKED_FOR_SAFETY')) {
            errorMessage = 'O conteúdo do prompt ou a imagem gerada foram bloqueados por motivos de segurança.';
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage, details: error.message })
        };
    }
};*/