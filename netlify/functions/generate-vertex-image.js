async function downloadVertexAIKeyFromB2() {
    // Verifica se a chave já existe
    if (fs.existsSync(TEMP_KEY_PATH)) {
        console.log('DEBUG: Chave do Vertex AI já existe em /tmp/. Reutilizando.');
        return;
    }

    // Validação das variáveis de ambiente
    if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_FILE_NAME) {
        throw new Error('Configurações do Backblaze B2 ausentes.');
    }

    try {
        const rawAuthString = `${B2_ACCOUNT_ID}:${B2_APPLICATION_KEY}`;
        const basicAuth = Buffer.from(rawAuthString).toString('base64');

        const authResponse = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': `Basic ${basicAuth}`
            }
        });

        const apiUrl = authResponse.data.apiUrl;
        const authorizationToken = authResponse.data.authorizationToken;

        // Listar buckets
        const listBucketsResponse = await axios.post(`${apiUrl}/b2api/v2/b2_list_buckets`, {
            accountId: B2_ACCOUNT_ID
        }, {
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            }
        });

        // Baixar o arquivo
        const downloadFileResponse = await axios.post(`${apiUrl}/b2api/v2/b2_download_file_by_name`, {
            bucketName: B2_BUCKET_NAME,
            fileName: B2_FILE_NAME
        }, {
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        fs.writeFileSync(TEMP_KEY_PATH, downloadFileResponse.data);
        console.log(`DEBUG: Arquivo ${B2_FILE_NAME} baixado com sucesso para ${TEMP_KEY_PATH}.`);

    } catch (error) {
        console.error('ERROR: Erro ao baixar chave do Vertex AI do Backblaze B2:', error.message);
        throw error; // Re-throw para tratamento posterior
    }
}
