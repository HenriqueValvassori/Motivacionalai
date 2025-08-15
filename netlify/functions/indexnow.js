// netlify/functions/indexnow.js

const fetch = require('node-fetch');

// As chaves de API e URLs de localização devem ser definidas como variáveis de ambiente
// no painel de controle do Netlify para garantir a segurança.
const INDEXNOW_API_KEY = process.env.INDEXNOW_API_KEY;
const KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION;

exports.handler = async (event, context) => {
    // Apenas requisições POST são aceitas
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
        };
    }

    try {
        const { urlList } = JSON.parse(event.body);

        if (!urlList || !Array.isArray(urlList) || urlList.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'A lista de URLs é obrigatória e não pode estar vazia.' })
            };
        }

        if (!INDEXNOW_API_KEY || !KEY_LOCATION) {
            console.error('As variáveis de ambiente para a chave da API não foram configuradas.');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configuração da chave de API ausente.' })
            };
        }

        const data = {
            host: "blogmotivacionalai.netlify.app",
            key: INDEXNOW_API_KEY,
            keyLocation: KEY_LOCATION,
            urlList: urlList
        };

        const response = await fetch('https://api.indexnow.org/IndexNow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('URLs enviados com sucesso via IndexNow.');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'URLs enviados com sucesso.' })
            };
        } else {
            const errorText = await response.text();
            console.error('Erro na resposta da API IndexNow:', response.status, errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Erro na API do IndexNow.', details: errorText })
            };
        }
    } catch (error) {
        console.error('Erro na requisição da função:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor.' })
        };
    }
};

