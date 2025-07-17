// netlify/functions/get-training-tips.js
require('dotenv').config(); // Carrega variáveis de ambiente (para testar localmente com netlify-cli)
const { getContent } = require('../../utils/db'); // Importa a lógica do DB

exports.handler = async (event, context) => {
    try {
        const prompt = "Crie um parágrafo de aproximadamente 10 linhas com dicas de treino para iniciantes. Não inclua introduções, títulos ou saudações, apenas o texto com as dicas diretamente.";
        const data = await getContent('dicas de treino', prompt, 'tips', 'tips');

        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Importante para CORS no frontend
            }
        };
    } catch (error) {
        console.error('Erro na função get-training-tips:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: error.message || 'Erro desconhecido ao gerar dicas de treino.' }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};