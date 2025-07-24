// netlify/functions/generate-vertex-image.js

require('dotenv').config(); 
const path = require('path');
const fs = require('fs');
const axios = require('axios'); 

// --- APENAS ESTA LINHA DEVE ESTAR AQUI PARA IMPORTAR VertexAI ---
// GARANTIR QUE NÃO HÁ NENHUMA OUTRA LINHA 'const VertexAI =' OU 'let VertexAI =' NESTE ARQUIVO
const { VertexAI } = require('@google-cloud/aiplatform');
// --- FIM DA IMPORTAÇÃO ÚNICA ---

// --- Configurações do Backblaze B2 ---
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_FILE_NAME = process.env.B2_FILE_NAME; // Nome do arquivo JSON da chave do Vertex AI no B2

// Caminho temporário para salvar a chave JSON
const TEMP_KEY_PATH = path.join('/tmp', B2_FILE_NAME);

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
    const GCP_LOCATION = process.env.GCP_LOCATION;

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
        await downloadVertexAIKeyFromB2();

        process.env.GOOGLE_APPLICATION_CREDENTIALS = TEMP_KEY_PATH;
        console.log('DEBUG: GOOGLE_APPLICATION_CREDENTIALS configurado para:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

        // --- ESTA É A FORMA CORRETA DE INSTANCIAR VertexAI ---
        const aiplatform = new VertexAI({ project: GCP_PROJECT_ID, location: GCP_LOCATION }); 
        const generativeModel = aiplatform.getGenerativeModel({ model: 'gemini-pro-vision' });
        // --- FIM DA INSTANCIAÇÃO ---

        let modelResponse;

        if (prompt && !imageUrl) {
            console.log('DEBUG: Chamando Vertex AI apenas com prompt de texto.');
            modelResponse = await generativeModel.generateContent(prompt);
        } else if (prompt && imageUrl) {
            console.log('DEBUG: Combinando prompt e imagem para Vertex AI...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', 
                    fileUri: imageUrl,
                },
            };
            const parts = [
                { text: prompt }, 
                imagePart
            ];
            modelResponse = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
        } else if (!prompt && imageUrl) {
            console.log('DEBUG: Analisando apenas imagem com Vertex AI...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', 
                    fileUri: imageUrl,
                },
            };
            const parts = [imagePart];
            modelResponse = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
        }

        const responseText = modelResponse.response.candidates[0].content.parts[0].text;
        console.log('DEBUG: Resposta do Vertex AI:', responseText);

        return {
            statusCode: 200,
            body: JSON.stringify({ generatedText: responseText }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };

    } catch (error) {
        console.error('ERROR: Erro na função generate-vertex-image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro ao processar requisição com Vertex AI: ' + error.message }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
};