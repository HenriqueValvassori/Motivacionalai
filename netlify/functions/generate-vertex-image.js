// netlify/functions/generate-vertex-image.js

require('dotenv').config(); 
const path = require('path');
const fs = require('fs');
const axios = require('axios'); 
const { GoogleAuth } = require('google-auth-library'); // Novo: Para obter token de acesso

// --- REMOVEMOS A IMPORTAÇÃO DO SDK DO VERTEX AI ---
// const { VertexAI } = require('@google-cloud/aiplatform'); 
// --- FIM DA REMOÇÃO ---

// --- Configurações do Backblaze B2 ---
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_FILE_NAME = process.env.B2_FILE_NAME; 

// Caminho temporário para salvar a chave JSON
const TEMP_KEY_PATH = path.join('/tmp', B2_FILE_NAME);
const GOOGLE_CREDENTIALS_ENV_VAR = 'GOOGLE_APPLICATION_CREDENTIALS'; // Nome da variável de ambiente

// ====================================================================================
// Função auxiliar para baixar a chave do Vertex AI do Backblaze B2 (usando AXIOS)
// ====================================================================================
async function downloadVertexAIKeyFromB2() {
    if (fs.existsSync(TEMP_KEY_PATH)) {
        console.log('DEBUG: Chave do Vertex AI já existe em /tmp/. Reutilizando.');
        return;
    }

    if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_FILE_NAME) {
        console.error('ERROR: Variáveis de ambiente do Backblaze B2 não configuradas corretamente (B2_ACCOUNT_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_FILE_NAME).');
        throw new Error('Configurações do Backblaze B2 ausentes.');
    }

    try {
        console.log(`DEBUG: Valor de B2_ACCOUNT_ID lido na função: ${B2_ACCOUNT_ID}`);
        console.log(`DEBUG: Valor de B2_APPLICATION_KEY lido na função (parcial): ${B2_APPLICATION_KEY.substring(0, 10)}...`);
        console.log(`DEBUG: Tentando autorizar no B2 com Account ID: ${B2_ACCOUNT_ID}`);

        const rawAuthString = `${B2_ACCOUNT_ID}:${B2_APPLICATION_KEY}`;
        const basicAuth = Buffer.from(rawAuthString).toString('base64');

        const authResponse = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: { 'Authorization': `Basic ${basicAuth}` }
        });

        const apiUrl = authResponse.data.apiUrl;
        const authorizationToken = authResponse.data.authorizationToken;
        const downloadBaseUrl = authResponse.data.downloadUrl;

        console.log('DEBUG: Autorização B2 bem-sucedida. apiUrl:', apiUrl);
        console.log('DEBUG: Base URL para download de arquivos (downloadUrl):', downloadBaseUrl);

        const encodedBucketName = encodeURIComponent(B2_BUCKET_NAME);
        const encodedFileName = encodeURIComponent(B2_FILE_NAME);
        
        const downloadFileUrl = `${downloadBaseUrl}/file/${encodedBucketName}/${encodedFileName}`; 

        console.log(`DEBUG: Tentando baixar arquivo: ${B2_FILE_NAME} do bucket: ${B2_BUCKET_NAME}`);
        console.log(`DEBUG: URL de download construída (FINAL): ${downloadFileUrl}`);

        const downloadFileResponse = await axios.get(downloadFileUrl, { 
            headers: { 'Authorization': authorizationToken },
            responseType: 'arraybuffer'
        });
        
        fs.writeFileSync(TEMP_KEY_PATH, downloadFileResponse.data);
        console.log(`DEBUG: Arquivo ${B2_FILE_NAME} baixado com sucesso para ${TEMP_KEY_PATH}.`);

    } catch (error) {
        console.error('ERROR: Erro ao baixar chave do Vertex AI do Backblaze B2:', error.message);
        if (error.response) {
            console.error('ERROR: Detalhes da resposta de erro HTTP:', error.response.status, JSON.stringify(error.response.data, null, 2));
        }
        throw new Error(`Falha ao baixar chave do Vertex AI do B2: ${error.response ? error.response.status : ''} - ${error.message}`);
    }
}
// ====================================================================================

// --- Handler da Função Netlify ---
exports.handler = async (event, context) => {
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
    const GCP_LOCATION = process.env.GCP_LOCATION; // Ex: us-central1
    const MODEL_ID = 'gemini-pro-vision'; // Ou 'gemini-pro' se for só texto

    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente do GCP (PROJECT_ID, LOCATION) não configuradas.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido. Use POST.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    let prompt, imageUrl;
    try {
        const body = JSON.parse(event.body);
        prompt = body.prompt;
        imageUrl = body.imageUrl;
    } catch (parseError) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Deve ser um JSON.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    if (!prompt && !imageUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Parâmetro "prompt" ou "imageUrl" é obrigatório.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    try {
        // 1. Baixar a chave do Vertex AI do B2 (se ainda não estiver em /tmp)
        await downloadVertexAIKeyFromB2();

        // 2. Configurar a variável de ambiente para o Google Cloud SDK (para google-auth-library)
        process.env[GOOGLE_CREDENTIALS_ENV_VAR] = TEMP_KEY_PATH;
        console.log('DEBUG: GOOGLE_APPLICATION_CREDENTIALS configurado para:', process.env[GOOGLE_CREDENTIALS_ENV_VAR]);

        // 3. Obter token de acesso OAuth2 com google-auth-library
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await auth.getClient();
        const accessToken = (await client.getAccessToken()).token;

        if (!accessToken) {
            throw new Error('Não foi possível obter o token de acesso para a API do Google Cloud.');
        }
        console.log('DEBUG: Token de acesso do Google Cloud obtido (parcial):', accessToken.substring(0, 10) + '...');

        // 4. Construir o corpo da requisição para a API REST do Vertex AI
        const vertexApiUrl = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;

        let requestBody = {};
        let contents = [];

        // Adiciona o prompt de texto
        if (prompt) {
            contents.push({ text: prompt });
        }

        // Se houver URL de imagem, adiciona-a
        if (imageUrl) {
            // Para URLs externas, a API do Vertex AI geralmente aceita diretamente.
            // Para imagens maiores ou privadas, você precisaria fazer o download e codificar em base64.
            // Para este exemplo, vamos assumir que a URL pode ser acessada pela API.
            contents.push({
                inlineData: { // Usamos inlineData para URLs que o modelo pode buscar, ou para base64
                    mimeType: 'image/jpeg', // IMPORTANTE: Ajuste conforme o tipo real da imagem (ex: 'image/png')
                    data: imageUrl // A API do Google suporta URLs diretamente para multimodal
                                    // Se for uma imagem local/buffer, seria o base64 aqui
                }
            });
            // NOTA: A documentação do Vertex AI sobre input de imagem pode ser específica.
            // Para URLs públicas, `fileData.fileUri` é o ideal. Para imagens que precisam ser enviadas,
            // `inlineData.data` com base64 da imagem é o caminho. Vamos tentar com a URL diretamente para simplificar.
            // Se isso falhar, teremos que baixar a imagem primeiro na função e converter para base64.

            // Revertendo para o formato de URL direta que o SDK usa, que a API REST também costuma aceitar
            // O modelo Gemini Pro Vision (Multimodal) geralmente espera `fileData` com `fileUri` para URLs.
            // Ou `inlineData` com `data` em base64 para dados binários.
            // Para simplificar, vou manter `inlineData` e a URL como `data`. Se falhar, é o ponto a ajustar para base64.
            // A melhor prática para URLs seria:
            contents.push({
                fileData: {
                    mimeType: 'image/jpeg', // ou 'image/png'
                    fileUri: imageUrl
                }
            });
            // Remover o prompt que adicionamos acima se estiver combinando com imagem
            // para evitar duplicidade de "text" ou mistura incorreta de partes.
            contents = []; // Zera para construir as partes corretamente
            if (prompt) {
                contents.push({ text: prompt });
            }
            contents.push({
                fileData: {
                    mimeType: 'image/jpeg', // ou 'image/png'
                    fileUri: imageUrl
                }
            });

        }

        requestBody = {
            contents: [{
                role: "user", // Sempre user para o input
                parts: contents
            }]
        };

        console.log('DEBUG: Enviando requisição para Vertex AI com body:', JSON.stringify(requestBody, null, 2));

        // 5. Enviar a requisição para a API REST do Vertex AI
        const response = await axios.post(vertexApiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const responseData = response.data;
        console.log('DEBUG: Resposta completa da API do Vertex AI:', JSON.stringify(responseData, null, 2));

        let generatedText = 'Nenhuma resposta de texto encontrada.';
        if (responseData && responseData.candidates && responseData.candidates.length > 0 && 
            responseData.candidates[0].content && responseData.candidates[0].content.parts && 
            responseData.candidates[0].content.parts.length > 0 && responseData.candidates[0].content.parts[0].text) {
            generatedText = responseData.candidates[0].content.parts[0].text;
        }

        console.log('DEBUG: Texto gerado pelo Vertex AI:', generatedText);

        return {
            statusCode: 200,
            body: JSON.stringify({ generatedText: generatedText }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };

    } catch (error) {
        console.error('ERROR: Erro na função generate-vertex-image (API REST):', error.message);
        if (error.response) {
            console.error('ERROR: Detalhes da resposta de erro HTTP (API REST):', error.response.status, JSON.stringify(error.response.data, null, 2));
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro ao processar requisição com Vertex AI (API REST): ' + (error.response && error.response.data ? JSON.stringify(error.response.data) : error.message) }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
};