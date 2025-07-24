// netlify/functions/generate-vertex-image.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const path = require('path');
const fs = require('fs');
const { VertexAI } = require('@google-cloud/aiplatform');

// --- Importe o SDK "backblaze" que você está usando ---
// CORREÇÃO AQUI: Tentar acessar o export 'default' ou o próprio módulo
const Bucket = require('backblaze').default || require('backblaze');

// --- Configurações do Backblaze B2 ---
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_FILE_NAME = process.env.B2_FILE_NAME; // Nome do arquivo JSON da chave do Vertex AI no B2

// Caminho temporário para salvar a chave JSON
// No ambiente Netlify Lambda, '/tmp/' é o único diretório gravável.
const TEMP_KEY_PATH = path.join('/tmp', B2_FILE_NAME);

// --- Função para baixar a chave JSON do Backblaze B2 ---
async function downloadVertexAIKeyFromB2() {
    if (fs.existsSync(TEMP_KEY_PATH)) {
        console.log('Chave do Vertex AI já existe em /tmp/. Reutilizando.');
        return;
    }

    if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_FILE_NAME) {
        console.error('Erro: Variáveis de ambiente do Backblaze B2 não configuradas corretamente.');
        throw new Error('Configurações do Backblaze B2 ausentes.');
    }

    console.log(`Baixando chave do Vertex AI do B2: ${B2_BUCKET_NAME}/${B2_FILE_NAME}`);

    try {
        console.log('Valor de B2_ACCOUNT_ID (lido na função):', process.env.B2_ACCOUNT_ID);
console.log('Valor de B2_APPLICATION_KEY (lido na função):', process.env.B2_APPLICATION_KEY);
        const bucket = Bucket(B2_BUCKET_NAME, { // Este 'Bucket' agora deve ser uma função
            id: B2_ACCOUNT_ID,
            key: B2_APPLICATION_KEY
        });

        // Use o método .download() para baixar o arquivo para o /tmp
        await bucket.download(B2_FILE_NAME, TEMP_KEY_PATH);

        console.log('Chave do Vertex AI baixada com sucesso para:', TEMP_KEY_PATH);

    } catch (error) {
        console.error('Erro ao baixar chave do Vertex AI do Backblaze B2:', error);
        throw new Error(`Falha ao baixar chave do Vertex AI do B2: ${error.message}`);
    }
}

// --- Handler da Função Netlify ---
exports.handler = async (event, context) => {
    // Configurações do Google Cloud
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
    const GCP_LOCATION = process.env.GCP_LOCATION;

    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente do GCP (PROJECT_ID, LOCATION) não configuradas.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    const { prompt, imageUrl } = JSON.parse(event.body);

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
        console.log('GOOGLE_APPLICATION_CREDENTIALS configurado para:', process.env.GOOGLE_APPLICATION_CREDENTIALS);


        // 3. Inicializar o cliente do Vertex AI
        const vertexAI = new VertexAI({ project: GCP_PROJECT_ID, location: GCP_LOCATION });
        const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-pro-vision' });

        let modelResponse;

        if (prompt && !imageUrl) {
            // Apenas texto (geração de texto descritivo para uma imagem)
            modelResponse = await generativeModel.generateContent(prompt);
        } else if (prompt && imageUrl) {
            // Multimodal: Texto + Imagem (para análise de imagem)
            // A imagem deve ser um objeto com mimeType e data
            // Para URLs de imagem, você precisaria baixá-la primeiro (ex: com node-fetch) e converter para base64 ou Buffer
            // Exemplo simplificado: assumindo que imageUrl já é base64 ou um caminho de arquivo acessível
            console.log('Combinando prompt e imagem...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', // Ajuste conforme o tipo real da imagem
                    fileUri: imageUrl, // Se for uma URL externa, Vertex AI pode buscar (depende da configuração)
                                       // Para imagens maiores ou privadas, você precisaria baixar e converter para base64/buffer
                },
            };
            const parts = [prompt, imagePart];
            modelResponse = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
        } else if (!prompt && imageUrl) {
            // Apenas imagem (descrição da imagem sem prompt adicional)
            console.log('Analisando apenas imagem...');
            const imagePart = {
                fileData: {
                    mimeType: 'image/jpeg', // Ajuste conforme o tipo real da imagem
                    fileUri: imageUrl,
                },
            };
            const parts = [imagePart];
            modelResponse = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
        }


        const responseText = modelResponse.response.candidates[0].content.parts[0].text;
        console.log('Resposta do Vertex AI:', responseText);

        return {
            statusCode: 200,
            body: JSON.stringify({ generatedText: responseText }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };

    } catch (error) {
        console.error('Erro na função generate-vertex-image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro ao gerar imagem/texto com Vertex AI: ' + error.message }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
};