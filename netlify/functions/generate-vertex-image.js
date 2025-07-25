// netlify/functions/generate-image-hf.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 1. Validar Método HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido. Use POST.' };
    }

    try {
        // 2. Parsear o Corpo da Requisição
        // Espera um JSON com { "prompt": "sua descrição aqui" }
        const { prompt } = JSON.parse(event.body);

        // 3. Obter o Token da API Hugging Face das Variáveis de Ambiente
        const HF_API_TOKEN = process.env.HF_API_TOKEN;

        // 4. Definir a URL da API do Modelo Hugging Face
        // Esta é a URL do modelo base que o Space "Ahmer22/Lora_Flux_Image_Free" utiliza.
        // Copiada da página do modelo/API no Hugging Face.
        const MODEL_API_URL = "https://api-inference.huggingface.co/models/Ahmer22/FLUX-LoRA-DLC-NEW";

        // 5. Validar Parâmetros Essenciais
        if (!HF_API_TOKEN) {
            console.error('Erro: Token da API Hugging Face (HF_API_TOKEN) não configurado nas variáveis de ambiente do Netlify.');
            return { statusCode: 500, body: 'Erro do servidor: Token de API não configurado.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Erro na requisição: Prompt de imagem não fornecido.' };
        }

        // 6. Fazer a Requisição para a API do Hugging Face
        const response = await fetch(
            MODEL_API_URL,
            {
                method: "POST",
                headers: {
                    // Autenticação com o token Bearer
                    "Authorization": `Bearer ${HF_API_TOKEN}`,
                    // Definir o Content-Type como application/json, conforme a API espera para o prompt
                    "Content-Type": "application/json"
                },
                // O corpo da requisição deve ser um JSON com o campo 'inputs' contendo o prompt
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        // 7. Tratar Respostas de Erro da API do Hugging Face
        if (!response.ok) {
            let errorBody;
            const contentType = response.headers.get('content-type');

            // Tenta ler o corpo como JSON se for o tipo esperado, senão lê como texto
            if (contentType && contentType.includes('application/json')) {
                errorBody = await response.json();
            } else {
                errorBody = await response.text();
            }

            console.error('Erro na API Hugging Face:', response.status, errorBody);

            // Retorna um erro com detalhes para o cliente
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: (typeof errorBody === 'object' && errorBody.error) ? errorBody.error : String(errorBody),
                    details: errorBody // Inclui os detalhes completos do erro para depuração
                })
            };
        }

        // 8. Processar Resposta de Sucesso (Imagem)
        // A API de inferência do Hugging Face para text-to-image retorna a imagem como um Blob binário.
        const imageBuffer = await response.buffer(); // Lê o corpo da resposta como um buffer
        const base64Image = imageBuffer.toString('base64'); // Converte o buffer para Base64
        const contentType = response.headers.get('content-type') || 'image/jpeg'; // Pega o tipo de conteúdo da imagem, com fallback

        // Retorna a imagem em Base64 para o cliente
        return {
            statusCode: 200,
            headers: {
                // Indica que o corpo da resposta é JSON
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // A imagem é retornada como um Data URL para ser facilmente exibida em HTML
                image: `data:${contentType};base64,${base64Image}`,
                message: 'Imagem gerada com sucesso!'
            })
        };

    } catch (error) {
        // 9. Tratar Erros Internos da Função Netlify
        console.error('Erro na função Netlify:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor.', details: error.message })
        };
    }
};