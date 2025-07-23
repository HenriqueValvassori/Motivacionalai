// netlify/functions/generate-vertex-image.js

// Carrega variáveis de ambiente (para teste local, no Netlify elas já estarão lá)
require('dotenv').config();

// --- BLOCo CRÍTICO DE AUTENTICAÇÃO VIA CONTA DE SERVIÇO ---
// Este código tenta configurar as credenciais da Service Account a partir de uma variável de ambiente.
// Ela espera que GOOGLE_APPLICATION_CREDENTIALS_JSON contenha o CONTEÚDO INTEIRO do JSON da sua chave de SA.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        const fs = require('fs');
        const path = require('path');
        const tempDir = '/tmp'; // Diretório temporário acessível em Netlify Functions
        const credentialsPath = path.join(tempDir, 'gcp-credentials.json');
        
        // Garante que o diretório temporário existe
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // Escreve o conteúdo JSON da variável de ambiente para um arquivo temporário
        fs.writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        
        // Aponta a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS para este arquivo
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        console.log("Credenciais da Service Account configuradas a partir da variável de ambiente.");
    } catch (e) {
        console.error("Erro ao configurar credenciais da Service Account:", e.message);
        // Não retornar erro fatal aqui, deixar que o PredictionServiceClient falhe se a config estiver errada
    }
}
// --- FIM DO BLOCO DE AUTENTICAÇÃO ---

// Importa o cliente do Vertex AI (PredictionServiceClient)
const { PredictionServiceClient } = require('@google-cloud/aiplatform');

// --- Configurações do Vertex AI ---
// IMPORTANTES: Configure estas variáveis de ambiente no Netlify!
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1'; // Ex: us-central1, europe-west4, etc.
const VERTEX_AI_ENDPOINT = `${GCP_LOCATION}-aiplatform.googleapis.com`;

// ID do Modelo Imagen que você quer usar
const IMAGEN_MODEL_ID = 'imagegeneration@latest'; // Este é o nome correto para o modelo Imagen no Vertex AI

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

    // Validação de variáveis de ambiente essenciais (GCP_PROJECT_ID, GCP_LOCATION)
    if (!GCP_PROJECT_ID || !GCP_LOCATION) {
        console.error("Erro: GCP_PROJECT_ID ou GCP_LOCATION não configurados nas variáveis de ambiente do Netlify.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Configurações do Google Cloud (GCP_PROJECT_ID, GCP_LOCATION) ausentes. Verifique suas variáveis de ambiente Netlify.' })
        };
    }
    
    // Validação da variável de autenticação da Service Account
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.error("Erro: Credenciais da Service Account Google Cloud não configuradas.");
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Credenciais da Service Account do Google Cloud ausentes. Configure GOOGLE_APPLICATION_CREDENTIALS_JSON.' })
        };
    }

    // Inicializa o cliente Vertex AI
    const client = new PredictionServiceClient({
        apiEndpoint: VERTEX_AI_ENDPOINT,
        // Authentication will try to use GOOGLE_APPLICATION_CREDENTIALS env var,
        // which is set by the block above if GOOGLE_APPLICATION_CREDENTIALS_JSON exists.
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
                // O Imagen aceita strings de proporção como '1:1', '16:9', '4:3', '3:4', '9:16'
                aspectRatio: aspectRatio || '1:1', 
            },
        ];

        const parameters = {
            sampleCount: 1, // Gera 1 imagem
            // Adicione outros parâmetros do modelo Imagen aqui se desejar (ex: seed, negative_prompt, etc.)
            // Veja a documentação da API Imagen para mais opções.
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
            // O Imagen geralmente retorna imagem base64 codificada em `bytesBase64Encoded`
            if (imagePrediction.bytesBase64Encoded) {
                imageUrl = `data:image/jpeg;base64,${imagePrediction.bytesBase64Encoded}`;
            } else if (imagePrediction.uri) {
                // Se o modelo for configurado para retornar URI GCS, seria tratado aqui
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
        if (error.code === 7 || error.code === 16) { // PERMISSION_DENIED (7), UNAUTHENTICATED (16)
             errorMessage = 'Erro de autenticação/permissão com Vertex AI. Verifique suas credenciais e roles da Service Account.';
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