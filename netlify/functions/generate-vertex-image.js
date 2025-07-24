// netlify/functions/generate-vertex-image.js

// 1. Adicione esta linha APENAS UMA VEZ no TOPO do seu arquivo
const axios = require('axios');

// ====================================================================================
// SCRIPT DE TESTE COM AXIOS - Função auxiliar para B2
// ====================================================================================
async function downloadVertexAIKeyFromB2(bucketName, fileName) {
    try {
        console.log(`DEBUG: Valor de B2_ACCOUNT_ID lido na função: ${process.env.B2_ACCOUNT_ID}`);
        console.log(`DEBUG: Valor de B2_APPLICATION_KEY lido na função: ${process.env.B2_APPLICATION_KEY}`);
        console.log(`DEBUG: Tentando autorizar no B2 com Account ID: ${process.env.B2_ACCOUNT_ID} e Application Key (primeiros 10 caracteres): ${process.env.B2_APPLICATION_KEY.substring(0, 10)}...`);

        // PASSO 1: Autorizar a conta B2 para obter um token de autorização e o apiUrl
        const rawAuthString = `${process.env.B2_ACCOUNT_ID}:${process.env.B2_APPLICATION_KEY}`;
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
        const authorizedAccountId = authResponse.data.accountId; // <<-- CAPTURE O ACCOUNT_ID DA RESPOSTA DE AUTORIZAÇÃO

        console.log('DEBUG: Autorização B2 bem-sucedida. apiUrl:', apiUrl);
        console.log('DEBUG: Token de autorização B2 obtido (parcial):', authorizationToken ? authorizationToken.substring(0, 10) + '...' : 'N/A');

        // PASSO 2: Listar buckets (USANDO O accountId RETORNADO PELA AUTORIZAÇÃO)
        const listBucketsUrl = `${apiUrl}/b2api/v2/b2_list_buckets`;
        const listBucketsPayload = { accountId: authorizedAccountId }; // <<-- MUDANÇA: USE authorizedAccountId AQUI

        console.log('DEBUG: B2_ACCOUNT_ID no momento da criação do payload (ORIGEM: authResponse.data.accountId):', authorizedAccountId); 
        console.log('DEBUG: Tentando listar buckets com URL:', listBucketsUrl);
        console.log('DEBUG: Payload para b2_list_buckets (JSON.stringify de nossa variável):', JSON.stringify(listBucketsPayload));

        const listBucketsResponse = await axios.post(listBucketsUrl, listBucketsPayload, {
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            }
        });
        console.log('DEBUG: b2_list_buckets bem-sucedido. Buckets:', JSON.stringify(listBucketsResponse.data.buckets, null, 2));


        // PASSO 3: Baixar o arquivo (se os passos anteriores funcionarem)
        const downloadFileUrl = `${apiUrl}/b2api/v2/b2_download_file_by_name`;
        console.log(`DEBUG: Tentando baixar arquivo: ${fileName} do bucket: ${bucketName}`);
        const downloadFileResponse = await axios.post(downloadFileUrl, {
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
        console.error('ERROR: Erro durante o processo B2:', error.message);
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


// Função principal do Netlify
exports.handler = async (event, context) => {
    try {
        const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
        const B2_FILE_NAME = process.env.B2_FILE_NAME;

        if (!B2_BUCKET_NAME || !B2_FILE_NAME) {
            throw new Error('Variáveis de ambiente B2_BUCKET_NAME ou B2_FILE_NAME não definidas.');
        }

        // COMENTE O CÓDIGO ANTIGO DO SDK 'backblaze-b2' AQUI
        // Exemplo do que você DEVE COMENTAR (adapte ao seu código REAL):
        /*
        // Se você tinha uma importação assim:
        // const B2 = require('backblaze-b2'); 
        // Comente ou remova-a.

        // Se você inicializava o B2 assim:
        // const b2 = new B2({
        //     accountId: process.env.B2_ACCOUNT_ID,
        //     applicationKey: process.env.B2_APPLICATION_KEY
        // });

        // E se você fazia chamadas como estas:
        // await b2.listBuckets(...);
        // const oldVertexAIKey = await b2.downloadFileByName({
        //     bucketName: B2_BUCKET_NAME,
        //     fileName: B2_FILE_NAME
        // });
        */
        // FIM DA SEÇÃO PARA COMENTAR O CÓDIGO ANTIGO


        // CHAME A NOVA FUNÇÃO downloadVertexAIKeyFromB2 AQUI:
        const vertexAIKey = await downloadVertexAIKeyFromB2(B2_BUCKET_NAME, B2_FILE_NAME);
        
        // Agora 'vertexAIKey' contém os dados da chave baixada
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