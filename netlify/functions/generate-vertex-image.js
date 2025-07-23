// netlify/functions/generate-vertex-image.js

// Carrega variáveis de ambiente (para teste local, no Netlify elas já estarão lá)
require('dotenv').config();

// Importa o cliente do Vertex AI (PredictionServiceClient)
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
// Importa GoogleAuth para lidar com autenticação, se necessário customizar
const { GoogleAuth } = require('google-auth-library');

// --- Configurações do Vertex AI ---
// IMPORTANTES: Configure estas variáveis de ambiente no Netlify!
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1'; // Ex: us-central1, asia-east1, etc.
const VERTEX_AI_ENDPOINT = `${GCP_LOCATION}-aiplatform.googleapis.com`;

// Modelo Imagen que você quer usar (ex: imagegeneration@latest, imagen-005, etc.)
// "imagen-3.0-fast-generate-001" NÃO É UM MODELO DO GOOGLE DIRETAMENTE PARA VERTEX AI via aiplatform,
// ele é um modelo Replicate. Para o Vertex AI, o modelo padrão é 'imagegeneration@latest' ou versões específicas.
const IMAGEN_MODEL_ID = 'imagegeneration@latest'; // Este é o nome correto para o modelo Imagen no Vertex AI

// --- Autenticação (A PARTE MAIS COMPLEXA) ---
// Para Netlify Functions, a forma mais robusta é usar as credenciais de uma Service Account.
// A biblioteca `@google-cloud/aiplatform` tenta usar Application Default Credentials.
// Isso significa que você PRECISA garantir que as credenciais da sua Service Account
// estejam disponíveis para o ambiente da Netlify Function.
// A forma mais comum (mas complexa e requer cuidado com segurança):
// 1. Crie uma Service Account com o papel 'Vertex AI User' no GCP.
// 2. Gere uma chave JSON para essa Service Account.
// 3. Copie o CONTEÚDO INTEIRO do JSON para uma variável de ambiente SECURA no Netlify
//    (ex: `GOOGLE_APPLICATION_CREDENTIALS_JSON`).
// 4. No início desta função (ou fora dela), você precisaria escrever esse JSON
//    para um arquivo temporário e apontar a variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS`
//    para esse arquivo. Isso é MUITO COMPLEXO para um exemplo simples.
//
// Como alternativa, você PODE tentar inicializar o cliente com uma API Key diretamente,
// mas isso é MENOS COMUM e pode não funcionar para todos os recursos do Vertex AI,
// já que ele prefere autenticação via IAM.
// const auth = new GoogleAuth({
//     credentials: {
//         client_email: process.env.GCP_CLIENT_EMAIL, // Da sua chave JSON da SA
//         private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'), // Da sua chave JSON da SA
//     },
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
// });
// let client; // O cliente será inicializado no handler

// O manipulador principal da sua Netlify Function
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: headers, body: '' };
    }

    // Validação de variáveis de ambiente essenciais
    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        console.error("Erro: GCP_PROJECT_ID ou GCP_LOCATION não configurados.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Configurações do Google Cloud (GCP_PROJECT_ID, GCP_LOCATION) ausentes.' })
        };
    }

    // Inicializa o cliente Vertex AI *dentro* do handler para garantir o contexto
    // e o reuso de conexão em cold starts (embora aqui seja a cada invocação).
    const client = new PredictionServiceClient({
        apiEndpoint: VERTEX_AI_ENDPOINT,
        // Authentication will try to use GOOGLE_APPLICATION_CREDENTIALS env var
        // or other default methods. This is the part that needs careful setup.
    });

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Esperado JSON.' })
        };
    }

    const { prompt, aspectRatio } = requestBody; // 'aspectRatio' do frontend

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'O "prompt" é obrigatório e deve ser uma string não vazia.' })
        };
    }

    try {
        console.log(`[Netlify Function - Vertex AI] Solicitando imagem com prompt: "${prompt}"`);

        // A estrutura do 'instances' e 'parameters' para Imagen
        const instances = [
            {
                prompt: prompt,
                // Adicione outros parâmetros se o modelo Imagen os aceitar e você quiser controlá-los
                // Por exemplo, 'sampleCount' (número de imagens), 'seed', 'aspectRatio'
                // O aspectRatio deve ser um string como "1:1", "16:9", "4:3", etc.
                // O Imagen aceita valores como 1.0 (1:1), 1.77 (16:9), 0.75 (3:4), etc.
                // Você precisaria mapear 'aspectRatio' do frontend para o valor numérico ou string que o Imagen espera.
                // Exemplo de mapeamento para Imagen:
                // aspectRatio: aspectRatio === '16:9' ? '1.77' : (aspectRatio === '4:3' ? '1.33' : '1.0'), // ou string '1:1' etc.
                aspectRatio: aspectRatio || '1:1', // Para Imagen, o '1:1' é comum. Veja docs para outros valores.
                // Para Imagen, geralmente você especifica 'imageSize' ou 'aspectRatio'
                // imageSize: '1024x1024', // ou '512x512', etc.
            },
        ];

        // Parâmetros de modelo (podem incluir filtros de segurança, etc.)
        const parameters = {
            sampleCount: 1, // Número de imagens a gerar
            // safetySettings: {}, // Opcional, para controle de conteúdo
        };

        const request = {
            endpoint: VERTEX_AI_ENDPOINT,
            model: IMAGEN_MODEL_ID,
            instances: client.helpers.toStruct(instances), // Converte para o formato Proto Struct
            parameters: client.helpers.toStruct(parameters), // Converte para o formato Proto Struct
            project: GCP_PROJECT_ID,
            location: GCP_LOCATION,
        };
        
        // Faz a chamada à API do Vertex AI
        // Este é um método assíncrono que retorna uma Promise
        const [response] = await client.predict(request);

        let imageUrl = null;
        if (response && response.predictions && response.predictions.length > 0) {
            // A saída do Imagen é geralmente uma imagem base64 codificada ou um URI GCS
            const imagePrediction = response.predictions[0];
            // Se o modelo retorna base64, ele estará em `bytesBase64Encoded` ou similar
            if (imagePrediction.bytesBase64Encoded) {
                // Para exibir em <img> tag, você precisa do prefixo data URI
                imageUrl = `data:image/jpeg;base64,${imagePrediction.bytesBase64Encoded}`;
            } else if (imagePrediction.uri) {
                // Se retornar um URI (GCS), pode ser necessário pré-autenticar ou ter acesso público
                imageUrl = imagePrediction.uri; 
            }
        }

        if (!imageUrl) {
            console.error("[Netlify Function - Vertex AI] Nenhuma URL de imagem ou base64 válida foi gerada.");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ error: "Nenhuma imagem válida foi gerada pelo Vertex AI. Verifique o prompt ou as configurações do modelo." })
            };
        }

        console.log("[Netlify Function - Vertex AI] Imagem gerada com sucesso. URL/Base64:", imageUrl.substring(0, 100) + '...'); // Log parcial para não poluir
        
        // --- Retorna a URL da IMAGEM ou o Data URI (base64) ---
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ imageUrl: imageUrl }) // Retorna a URL da imagem (ou data URI)
        };

    } catch (error) {
        console.error('[Netlify Function - Vertex AI] Erro ao chamar o modelo Imagen:', error);
        // Erros comuns aqui serão de autenticação, permissões, ou formato de input/output.
        let errorMessage = error.details || error.message;
        if (error.code === 7 || error.code === 16) { // PERMISSION_DENIED (7), UNAUTHENTICATED (16)
             errorMessage = 'Erro de autenticação/permissão com Vertex AI. Verifique suas credenciais e roles da Service Account.';
        }
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: `Erro interno ao gerar imagem com Vertex AI: ${errorMessage}` })
        };
    }
};