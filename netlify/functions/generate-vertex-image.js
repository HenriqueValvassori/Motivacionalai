// netlify/functions/generate-vertex-image.js
const axios = require('axios');
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


async function downloadVertexAIKeyFromB2(bucketName, fileName) {
    try {
        console.log(`DEBUG: Tentando autorizar no B2 com Account ID: ${process.env.B2_ACCOUNT_ID} e Application Key: ${process.env.B2_APPLICATION_KEY}`);

        // PASSO 1: Autorizar a conta B2 para obter um token de autorização e o apiUrl
        const basicAuth = Buffer.from(`${process.env.B2_ACCOUNT_ID}:${process.env.B2_APPLICATION_KEY}`).toString('base64');
        
        const authResponse = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': `Basic ${basicAuth}`
            }
        });

        const apiUrl = authResponse.data.apiUrl;
        const authorizationToken = authResponse.data.authorizationToken;

        console.log('DEBUG: Autorização B2 bem-sucedida. apiUrl:', apiUrl);
        console.log('DEBUG: Token de autorização B2 obtido (parcial):', authorizationToken ? authorizationToken.substring(0, 10) + '...' : 'N/A');

        // PASSO 2: Listar buckets (isso é o que estava falhando antes)
        // Usaremos o authorizationToken obtido do passo de autorização
        const listBucketsUrl = `${apiUrl}/b2api/v2/b2_list_buckets`;
        const listBucketsResponse = await axios.post(listBucketsUrl, {}, {
            headers: {
                'Authorization': authorizationToken, // Usando o token obtido
                'Content-Type': 'application/json'
            }
        });
        console.log('DEBUG: b2_list_buckets bem-sucedido. Buckets:', listBucketsResponse.data.buckets);


        // PASSO 3: Baixar o arquivo (se os passos anteriores funcionarem)
        const downloadUrl = `${apiUrl}/b2api/v2/b2_download_file_by_name`; // ou b2_get_download_url
        const downloadFileResponse = await axios.post(downloadUrl, {
            bucketName: bucketName,
            fileName: fileName
        }, {
            headers: {
                'Authorization': authorizationToken, // Usando o token obtido
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer' // Para chaves, é melhor como arraybuffer ou string
        });
        
        console.log(`DEBUG: Arquivo ${fileName} baixado com sucesso.`);
        return downloadFileResponse.data;

    } catch (error) {
        console.error('ERROR: Erro ao baixar chave do Vertex AI do Backblaze B2:', error.message);
        if (error.response) {
            console.error('ERROR: Detalhes da resposta de erro:', error.response.status, error.response.data);
            // Se o erro ainda for 401 e o Authorization header ainda tiver a Master Key,
            // precisaremos de mais investigação.
            console.error('ERROR: Headers da requisição que falhou:', error.config.headers.Authorization);
        }
        throw new Error(`Falha ao baixar chave do Vertex AI do B2: ${error.response ? error.response.status : ''} - ${error.message}`);
    }
}
// ====================================================================================


// Função principal do Netlify
exports.handler = async (event, context) => {
    try {
        const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
        const B2_FILE_NAME = process.env.B2_FILE_NAME;

        if (!B2_BUCKET_NAME || !B2_FILE_NAME) {
            throw new Error('Variáveis de ambiente B2_BUCKET_NAME ou B2_FILE_NAME não definidas.');
        }

        // COMENTE O CÓDIGO ANTIGO DO SDK AQUI (se houver)
        // Por exemplo, linhas que começam com 'const b2 = new B2(...)'
        // ou 'await b2.listBuckets(...)' e 'await b2.downloadFileByName(...)'
        /*
        // EXEMPLO DO QUE VOCÊ PODE COMENTAR (ADAPTE AO SEU CÓDIGO REAL):
        const B2 = require('backblaze-b2'); // Comente ou remova esta importação se for apenas para o SDK antigo
        const b2 = new B2({
            accountId: process.env.B2_ACCOUNT_ID,
            applicationKey: process.env.B2_APPLICATION_KEY
        });
        // await b2.listBuckets(...); // Comente esta linha
        // const oldVertexAIKey = await b2.downloadFileByName(...); // Comente esta linha
        */


        // CHAME A NOVA FUNÇÃO downloadVertexAIKeyFromB2 AQUI:
        const vertexAIKey = await downloadVertexAIKeyFromB2(B2_BUCKET_NAME, B2_FILE_NAME);
        
        // ... (seu código para usar a chave, que agora virá de 'vertexAIKey') ...

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Chave do Vertex AI baixada e processada com sucesso.' })
        };

    } catch (error) {
        console.error('ERROR: Erro na função generate-vertex-image:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};





// --- Função para baixar a chave JSON do Backblaze B2 ---
/*async function downloadVertexAIKeyFromB2() {
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
}*/

// --- Handler da Função Netlify ---
/*exports.handler = async (event, context) => {
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
};*/