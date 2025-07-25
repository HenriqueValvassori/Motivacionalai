// netlify/functions/generate-image-gemini.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // 1. Validar Método HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido. Use POST.' };
    }

    try {
        // 2. Parsear o Corpo da Requisição
        // Espera um JSON com { "prompt": "sua descrição aqui" }
        const { prompt } = JSON.parse(event.body);

        // 3. Obter a Chave da API Gemini das Variáveis de Ambiente
        // IMPORTANTE: Configure GEMINI_API_KEY no Netlify
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error('Erro: Chave da API Gemini (GEMINI_API_KEY) não configurada nas variáveis de ambiente do Netlify.');
            return { statusCode: 500, body: 'Erro do servidor: Chave de API Gemini não configurada.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Erro na requisição: Prompt de imagem não fornecido.' };
        }

        // 4. Inicializar o cliente Gemini
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // 5. Obter o modelo para geração de imagens (Imagem 2.0 Flash Preview)
        // O nome do modelo pode variar. 'gemini-1.5-flash-latest' é uma opção que pode suportar imagem.
        // O nome específico para geração de imagem pode ser 'image-generation-005' ou similar,
        // mas o SDK geralmente permite "multimodal models" para isso.
        // O modelo 'gemini-1.5-flash-latest' é o mais comum para uso econômico e multimodal.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Ou "models/gemini-1.5-flash-latest"

        // 6. Criar o conteúdo da requisição para geração de imagem
        const result = await model.generateContent({
            // A API Gemini usa 'parts' para conteúdo multimodal
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    // Para geração de imagem, você não fornece uma imagem de entrada, apenas o texto
                ]
            }],
            // Opções de segurança (ajuste conforme necessário)
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
            // As configurações de geração para imagem são específicas do modelo.
            // Para o Gemini 2.0 Flash (ou Imagen), você esperaria um formato de imagem nas opções,
            // mas o SDK do Gemini para 'generateContent' é mais focado em texto/multimodal.
            // A geração de imagem *pura* com Gemini é mais direta através da API do Imagen.
            // Se o 'gemini-1.5-flash' não funcionar para gerar imagens *diretamente como saída*,
            // você pode precisar usar o endpoint específico do Imagen via REST API, que é mais complexo.
            // No entanto, para fins de teste, vamos tentar com o generateContent primeiro.
        });

        // O resultado da geração de imagem pode vir de várias formas.
        // Se a API retornar uma imagem Base64 dentro do texto ou de outra estrutura:
        const responseData = result.response.text(); // Tentamos pegar o texto, que pode ser Base64 ou um URL

        // Esta parte é experimental e pode precisar de ajuste dependendo do formato exato da resposta.
        // A API Gemini 1.5 Flash é para multimodal (texto+imagem), mas a geração *de imagem* como saída
        // para um prompt de *texto* pode ter uma estrutura de resposta diferente de texto puro ou HTML.
        // Você pode precisar inspecionar `result.response.candidates[0].content.parts` para ver o formato.

        // Exemplo hipotético se retornar um Data URL:
        if (responseData.startsWith("data:image/")) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: responseData, // Já é um Data URL
                    message: 'Imagem gerada com sucesso com Gemini!',
                })
            };
        } else {
             // Se não for um Data URL, pode ser um erro ou outro formato
            console.error('Resposta da API Gemini não é uma Data URL de imagem esperada:', responseData);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Erro: A API Gemini não retornou uma imagem no formato esperado. Talvez o modelo não suporte geração direta de imagem para este endpoint.',
                    details: responseData // Retorna a resposta bruta para depuração
                })
            };
        }


    } catch (error) {
        console.error('Erro na função Netlify (Gemini):', error);

        // Tratamento de erros específicos da API Gemini (por exemplo, cotas excedidas)
        let errorMessage = 'Erro interno do servidor.';
        if (error.message.includes('Quota exceeded')) {
            errorMessage = 'Cota da API Gemini excedida. Tente novamente mais tarde ou verifique seu plano.';
        } else if (error.message.includes('BLOCKED_FOR_SAFETY')) {
            errorMessage = 'O conteúdo do prompt ou a imagem gerada foram bloqueados por motivos de segurança.';
        } else {
             errorMessage += ` Detalhes: ${error.message}`;
        }


        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage, details: error.message })
        };
    }
};