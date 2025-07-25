// netlify/functions/generate-image-flux.js (sugiro renomear para refletir o modelo/Space)
/*const fetch = require('node-fetch');


exports.handler = async function(event, context) {
    // 1. Validar Método HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido. Use POST.' };
    }

    try {
        // 2. Parsear o Corpo da Requisição do seu frontend
        // Espera um JSON com { "prompt": "sua descrição aqui", "negative_prompt": "...", "width": 512, ... }
        const {
            prompt,
            negative_prompt = "", // Default para string vazia
            seed = 0,
            randomize_seed = true,
            width = 1024, // Usando os defaults da documentação do FLUX
            height = 1024, // Usando os defaults da documentação do FLUX
            guidance_scale = 0,
            num_inference_steps = 2
        } = JSON.parse(event.body);

        // 3. Obter o Token da API Hugging Face (Se o Space for privado ou exigir autenticação)
        // O README do Space não indica que é privado, mas é boa prática ter isso.
        // Se a chamada falhar sem o token, descomente e adicione no Netlify.
        // const HF_API_TOKEN = process.env.HF_API_TOKEN;

        // 4. Definir a URL do Endpoint do Gradio Space
        // Para um Gradio Space, a API de inferência geralmente é /run/<api_name>
        const GRADIO_SPACE_URL = "https://Ahmer22-Lora-Flux-Image-Free.hf.space/run/infer"; // URL específica do Space

        // 5. Validar Parâmetros Essenciais
        if (!prompt) {
            return { statusCode: 400, body: 'Erro na requisição: Prompt de imagem é obrigatório.' };
        }
        // if (!HF_API_TOKEN) {
        //     console.error('Erro: Token da API Hugging Face (HF_API_TOKEN) não configurado.');
        //     return { statusCode: 500, body: 'Erro do servidor: Token de API não configurado.' };
        // }


        // 6. Preparar o Corpo da Requisição para o Gradio API /infer
        // Os dados precisam estar em um array, conforme o Gradio API.
        const requestBody = {
            data: [
                prompt,
                negative_prompt,
                seed,
                randomize_seed,
                width,
                height,
                guidance_scale,
                num_inference_steps
            ]
        };

        // 7. Fazer a Requisição POST para o Gradio Space
        const response = await fetch(
            GRADIO_SPACE_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'Authorization': `Bearer ${HF_API_TOKEN}` // Descomente se for necessário autenticar
                },
                body: JSON.stringify(requestBody),
            }
        );

        // 8. Tratar Respostas de Erro do Gradio API
        if (!response.ok) {
            let errorBody;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                errorBody = await response.json();
            } else {
                errorBody = await response.text();
            }

            console.error('Erro na API do Gradio Space:', response.status, errorBody);

            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: (typeof errorBody === 'object' && errorBody.detail) ? errorBody.detail : String(errorBody),
                    details: errorBody // Inclui os detalhes completos do erro para depuração
                })
            };
        }

        // 9. Processar Resposta de Sucesso (Imagem)
        const data = await response.json();

        // O resultado esperado é uma lista com 2 elementos: [0] string (Data URL da imagem), [1] number (seed)
        const imageUrl = data.data && data.data[0]; // Isso já deve ser um Data URL (data:image/png;base64,...)

        if (!imageUrl) {
            console.error('Erro: Resposta inesperada da API do Gradio Space:', data);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Erro: Não foi possível obter a imagem da resposta da API.', details: data })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageUrl, // Já é um Data URL
                message: 'Imagem gerada com sucesso!',
                seed: data.data[1] // Retorna o seed usado
            })
        };

    } catch (error) {
        // 10. Tratar Erros Internos da Função Netlify
        console.error('Erro na função Netlify:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor.', details: error.message })
        };
    }
};*/