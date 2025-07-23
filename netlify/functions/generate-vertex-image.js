// netlify/functions/generate-vertex-image.js

require('dotenv').config(); // Para testes locais (carrega .env)

// --- Importações Necessárias ---
const B2 = require('b2-sdk-js'); // Para acessar o Backblaze B2
const { PredictionServiceClient } = require('@google-cloud/aiplatform'); // Para a API Vertex AI
const fs = require('fs');
const path = require('path');

// --- Configurações do Vertex AI ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';
const VERTEX_AI_ENDPOINT = `${GCP_LOCATION}-aiplatform.googleapis.com`;
const IMAGEN_MODEL_ID = 'imagegeneration@latest';

// --- Variáveis para o Backblaze B2 ---
// Estes são os valores que você configurou no Netlify
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_FILE_NAME = process.env.B2_FILE_NAME;
const TEMP_CREDENTIALS_PATH = '/tmp/gcp-credentials.json'; // Caminho temporário para a chave

// O manipulador principal da sua Netlify Function
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Ajuste para domínios específicos em produção!
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: headers, body: '' };
    }

    // Validação das variáveis de ambiente essenciais para o GCP
    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        console.error("Erro: GCP_PROJECT_ID ou GCP_LOCATION não configurados nas variáveis de ambiente do Netlify.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Configurações do Google Cloud (GCP_PROJECT_ID, GCP_LOCATION) ausentes.' })
        };
    }

    // Validação das variáveis de ambiente Backblaze B2
    if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_FILE_NAME) {
        console.error("Erro: Variáveis de ambiente do Backblaze B2 ausentes.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Configuração do Backblaze B2 ausente. Verifique B2_ACCOUNT_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME e B2_FILE_NAME.' })
        };
    }
    
    // --- INÍCIO do Bloco de Autenticação com Backblaze B2 ---
    try {
        // Verifica se a chave já foi baixada em invocações quentes (para reuso e evitar downloads repetidos)
        if (!fs.existsSync(TEMP_CREDENTIALS_PATH)) {
            console.log("Baixando credenciais da Service Account do Google Cloud do Backblaze B2...");

            const b2 = new B2({
                accountId: B2_ACCOUNT_ID,
                applicationKey: B2_APPLICATION_KEY
            });

            // Autenticar no B2
            await b2.authorize();

            // Obter informações do bucket
            const { buckets } = await b2.listBuckets();
            const targetBucket = buckets.find(b => b.bucketName === B2_BUCKET_NAME);

            if (!targetBucket) {
                throw new Error(`Bucket '${B2_BUCKET_NAME}' não encontrado ou não acessível.`);
            }

            // Obter informações do arquivo
            const { files } = await b2.listFileNames({
                bucketId: targetBucket.bucketId,
                startFileName: B2_FILE_NAME,
                maxFileCount: 1
            });

            const targetFile = files.find(f => f.fileName === B2_FILE_NAME);

            if (!targetFile) {
                throw new Error(`Arquivo '${B2_FILE_NAME}' não encontrado no bucket '${B2_BUCKET_NAME}'.`);
            }

            // Baixar o arquivo
            const { data } = await b2.downloadFileById({
                fileId: targetFile.fileId,
                responseType: 'arraybuffer' // Baixa como ArrayBuffer
            });

            // Converter ArrayBuffer para Buffer e salvar
            const fileContent = Buffer.from(data);
            fs.writeFileSync(TEMP_CREDENTIALS_PATH, fileContent);
            
            // Define a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS para a biblioteca Vertex AI
            process.env.GOOGLE_APPLICATION_CREDENTIALS = TEMP_CREDENTIALS_PATH;
            console.log("Credenciais da Service Account Google Cloud baixadas e configuradas.");
        } else {
            console.log("Credenciais da Service Account Google Cloud já existentes em /tmp.");
        }
    } catch (e) {
        console.error("Erro ao baixar ou configurar credenciais da Service Account do Backblaze B2:", e.message);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: `Falha ao configurar autenticação Vertex AI via B2: ${e.message}. Verifique suas chaves B2, permissões do bucket ou o nome do arquivo.` })
        };
    }
    // --- FIM do Bloco de Autenticação com Backblaze B2 ---

    // Inicializa o cliente Vertex AI
    const client = new PredictionServiceClient({
        apiEndpoint: VERTEX_AI_ENDPOINT,
        // O cliente agora usará GOOGLE_APPLICATION_CREDENTIALS definido acima.
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

    const { prompt, aspectRatio } = requestBody; 

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'O "prompt" é obrigatório e deve ser uma string não vazia.' })
        };
    }

    try {
        console.log(`[Netlify Function - Vertex AI] Solicitando imagem com prompt: "${prompt}" e proporção "${aspectRatio}"`);

        const instances = [
            {
                prompt: prompt,
                aspectRatio: aspectRatio || '1:1', 
            },
        ];

        const parameters = {
            sampleCount: 1, 
        };

        const request = {
            endpoint: VERTEX_AI_ENDPOINT,
            model: IMAGEN_MODEL_ID,
            instances: client.helpers.toStruct(instances),
            parameters: client.helpers.toStruct(parameters),
            project: GCP_PROJECT_ID,
            location: GCP_LOCATION,
        };
        
        const [response] = await client.predict(request);

        let imageUrl = null;
        if (response && response.predictions && response.predictions.length > 0) {
            const imagePrediction = response.predictions[0];
            if (imagePrediction.bytesBase64Encoded) {
                imageUrl = `data:image/jpeg;base64,${imagePrediction.bytesBase64Encoded}`;
            } else if (imagePrediction.uri) {
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

        console.log("[Netlify Function - Vertex AI] Imagem gerada com sucesso. URL/Base64:", imageUrl.substring(0, 100) + '...'); 
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ imageUrl: imageUrl })
        };

    } catch (error) {
        console.error('[Netlify Function - Vertex AI] Erro ao chamar o modelo Imagen:', error);
        let errorMessage = error.details || error.message;
        if (error.code === 7 || error.code === 16) {
             errorMessage = 'Erro de autenticação/permissão com Vertex AI. Verifique suas credenciais e roles da Service Account (incluindo acesso ao Backblaze B2).';
        } else if (error.message && error.message.includes('A billing account is not enabled')) {
            errorMessage = 'Conta de faturamento não habilitada no seu projeto Google Cloud. O Vertex AI requer uma conta de faturamento ativa.';
        }
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: `Erro interno ao gerar imagem com Vertex AI: ${errorMessage}` })
            };
        }
    };