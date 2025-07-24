// netlify/functions/generate-vertex-image.js

require('dotenv').config(); // Carrega variáveis de ambiente (útil para testar localmente com netlify-cli)
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // Importa o axios
const { VertexAI } = require('@google-cloud/aiplatform');
// --- MUDANÇA CRÍTICA AQUI ---
// Importa o pacote @google-cloud/aiplatform inteiro
;
// Acessa a classe VertexAI do módulo importado
const VertexAI = aiplatformModule.VertexAI;
// --- FIM DA MUDANÇA CRÍTICA ---

// --- Configurações do Backblaze B2 ---
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_FILE_NAME = process.env.B2_FILE_NAME; // Nome do arquivo JSON da chave do Vertex AI no B2

// Caminho temporário para salvar a chave JSON
// No ambiente Netlify Lambda, '/tmp/' é o único diretório gravável.
const TEMP_KEY_PATH = path.join('/tmp', B2_FILE_NAME);

// ====================================================================================
// Função auxiliar para baixar a chave do Vertex AI do Backblaze B2 (usando AXIOS)
// ====================================================================================
async function downloadVertexAIKeyFromB2() {
    // Verifica se a chave já existe no diretório temporário para evitar download repetido
    if (fs.existsSync(TEMP_KEY_PATH)) {
        console.log('DEBUG: Chave do Vertex AI já existe em /tmp/. Reutilizando.');
        return;
    }

    // Validação inicial das variáveis de ambiente do B2
    if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_FILE_NAME) {
        console.error('ERROR: Variáveis de ambiente do Backblaze B2 não configuradas corretamente (B2_ACCOUNT_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_FILE_NAME).');
        throw new Error('Configurações do Backblaze B2 ausentes.');
    }

    try {
        console.log(`DEBUG: Valor de B2_ACCOUNT_ID lido na função: ${B2_ACCOUNT_ID}`);
        console.log(`DEBUG: Valor de B2_APPLICATION_KEY lido na função (parcial): ${B2_APPLICATION_KEY.substring(0, 10)}...`);
        console.log(`DEBUG: Tentando autorizar no B2 com Account ID: ${B2_ACCOUNT_ID}`);

        // PASSO 1: Autorizar a conta B2 para obter um token de autorização e o apiUrl
        const rawAuthString = `${B2_ACCOUNT_ID}:${B2_APPLICATION_KEY}`;
        console.log('DEBUG: String Auth Crua para b2_authorize_account (parcial):', rawAuthString.substring(0, 15) + '...' + rawAuthString.slice(-10));
        const basicAuth = Buffer.from(rawAuthString).toString('base64');
        console.log('DEBUG: String Basic Auth gerada para b2_authorize_account (primeiros 10 caracteres):', basicAuth.substring(0, 10) + '...');

        const authResponse = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': `Basic ${basicAuth}`
            }
        });

        console.log('DEBUG: Status da resposta de autorização:', authResponse.status);
        console.log('DEBUG: Dados completos da resposta de autorização (authResponse.data):', JSON.stringify(authResponse.data, null, 2));
        console.log('DEBUG: Account ID RETORNADO pela autorização (authResponse.data.accountId):', authResponse.data.accountId); 

        const apiUrl = authResponse.data.apiUrl;
        const authorizationToken = authResponse.data.authorizationToken;
        const downloadBaseUrl = authResponse.data.downloadUrl; // Pega o downloadUrl aqui!

        console.log('DEBUG: Autorização B2 bem-sucedida. apiUrl:', apiUrl);
        console.log('DEBUG: Token de autorização B2 obtido (parcial):', authorizationToken ? authorizationToken.substring(0, 10) + '...' : 'N/A');
        console.log('DEBUG: Base URL para download de arquivos (downloadUrl):', downloadBaseUrl);


        // PASSO 2: Listar buckets para verificar (usaremos B2_ACCOUNT_ID da variável de ambiente, que deve estar correto agora)
        const listBucketsUrl = `${apiUrl}/b2api/v2/b2_list_buckets`;
        const listBucketsPayload = { accountId: B2_ACCOUNT_ID }; 
        
        console.log('DEBUG: B2_ACCOUNT_ID no momento da criação do payload (ORIGEM: process.env.B2_ACCOUNT_ID):', B2_ACCOUNT_ID); 
        console.log('DEBUG: Tentando listar buckets com URL:', listBucketsUrl);
        console.log('DEBUG: Payload para b2_list_buckets (JSON.stringify de nossa variável):', JSON.stringify(listBucketsPayload));

        const listBucketsResponse = await axios.post(listBucketsUrl, listBucketsPayload, {
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            }
        });
        console.log('DEBUG: b2_list_buckets bem-sucedido. Buckets:', JSON.stringify(listBucketsResponse.data.buckets, null, 2));

        // PASSO 3: Baixar o arquivo (USANDO GET E A URL DE DOWNLOAD DIRETA CORRETA)
        // A URL correta para baixar um arquivo por nome é construída usando o 'downloadUrl'
        // retornado pela autorização, seguido por '/file/<bucketName>/<fileName>'.
        
        // É importante codificar os componentes da URL para garantir que caracteres especiais funcionem.
        const encodedBucketName = encodeURIComponent(B2_BUCKET_NAME);
        const encodedFileName = encodeURIComponent(B2_FILE_NAME);
        
        // Construindo a URL de download final
        const downloadFileUrl = `${downloadBaseUrl}/file/${encodedBucketName}/${encodedFileName}`; 

        console.log(`DEBUG: Tentando baixar arquivo: ${B2_FILE_NAME} do bucket: ${B2_BUCKET_NAME}`);
        console.log(`DEBUG: URL de download construída (FINAL): ${downloadFileUrl}`);

        const downloadFileResponse = await axios.get(downloadFileUrl, { 
            headers: {
                'Authorization': authorizationToken, // Usando o token obtido
            },
            responseType: 'arraybuffer' // Para arquivos JSON, arraybuffer ou string são adequados
        });
        
        // Escrever o conteúdo do arquivo no diretório /tmp
        fs.writeFileSync(TEMP_KEY_PATH, downloadFileResponse.data);
        console.log(`DEBUG: Arquivo ${B2_FILE_NAME} baixado com sucesso para ${TEMP_KEY_PATH}.`);

    } catch (error) {
        console.error('ERROR: Erro ao baixar chave do Vertex AI do Backblaze B2:', error.message);
        if (error.response) {
            console.error('ERROR: Detalhes da resposta de erro HTTP:', error.response.status, JSON.stringify(error.response.data, null, 2));
            console.error('ERROR: Headers da REQUISIÇÃO que falhou (se disponível no erro):', error.config && error.config.headers ? error.config.headers.Authorization : 'N/A');
            console.error('ERROR: URL da requisição que falhou:', error.config.url);
            console.error('ERROR: Dados ENVIADOS na requisição que falhou (error.config.data):', error.config && error.config.data ? error.config.data : 'N/A');
        }
        throw new Error(`Falha ao baixar chave do Vertex AI do B2: ${error.response ? error.response.status : ''} - ${error.message}`);
    }
}
// ====================================================================================

// --- Handler da Função Netlify ---
exports.handler = async (event, context) => {
    // Configurações do Google Cloud
    const aiplatform = new VertexAI({ project: GCP_PROJECT_ID, location: GCP_LOCATION }); 
const generativeModel = aiplatform.getGenerativeModel({ model: 'gemini-pro-vision' });
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
    const GCP_LOCATION = process.env.GCP_LOCATION;

    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente do GCP (PROJECT_ID, LOCATION) não configuradas.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    // Garante que o método da requisição seja POST
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

        // 2. Configurar a variável de ambiente para o Google Cloud SDK
        process.env.GOOGLE_APPLICATION_CREDENTIALS = TEMP_KEY_PATH;
        console.log('DEBUG: GOOGLE_APPLICATION_CREDENTIALS configurado para:', process.env.GOOGLE_APPLICATION_CREDENTIALS);


        // 3. Inicializar o cliente do Vertex AI
        // --- MUDANÇA CRÍTICA AQUI ---
        // Acessa VertexAI do módulo importado, e então obtém o GenerativeModel
        const aiplatform = new VertexAI({ project: GCP_PROJECT_ID, location: GCP_LOCATION }); 
        const generativeModel = aiplatform.getGenerativeModel({ model: 'gemini-pro-vision' });
        // --- FIM DA MUDANÇA CRÍTICA ---

        let modelResponse;

        if (prompt && !imageUrl) {
            // Apenas texto (geração de texto descritivo para uma imagem)
            console.log('DEBUG: Chamando Vertex AI apenas com prompt de texto.');
            modelResponse = await generativeModel.generateContent(prompt);
        } else if (prompt && imageUrl) {
            // Multimodal: Texto + Imagem (para análise de imagem)
            console.log('DEBUG: Combinando prompt e imagem para Vertex AI...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', // IMPORTANTE: Ajuste conforme o tipo real da imagem (ex: 'image/png')
                    fileUri: imageUrl, // Se for uma URL externa, Vertex AI pode buscar.
                                        // Para imagens maiores ou privadas, você precisaria baixá-la primeiro e converter para base64/buffer
                },
            };
            const parts = [
                { text: prompt }, // O prompt deve ser um objeto de texto no array de partes
                imagePart
            ];
            modelResponse = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
        } else if (!prompt && imageUrl) {
            // Apenas imagem (descrição da imagem sem prompt adicional)
            console.log('DEBUG: Analisando apenas imagem com Vertex AI...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', // IMPORTANTE: Ajuste conforme o tipo real da imagem
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