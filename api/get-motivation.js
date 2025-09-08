// netlify/functions/get-motivation.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const { getContent } = require('../../utils/db'); // Importa a lógica do DB

exports.handler = async (event, context) => {
    try {
        const prompt = "Crie uma frase motivadora para mim, mostre apenas a frase. Não inicie a fala com 'boa ideia!' ou 'que interessante' ou qualquer outra introdução. Apenas a frase.";
        const data = await getContent('frase motivacional', prompt, 'phrases', 'phrase');

        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Importante para CORS no frontend
            }
        };
    } catch (error) {
        console.error('Erro na função get-motivation:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: error.message || 'Erro desconhecido ao gerar frase motivacional.' }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};