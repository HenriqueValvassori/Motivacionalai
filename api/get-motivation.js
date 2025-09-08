// api/get-motivation.js

require('dotenv').config();
const { getContent } = require('../../utils/db');

export default async function (req, res) {
    try {
        console.log('Iniciando a função get-motivation...'); // Log para saber que a função começou
        
        const prompt = "Crie uma frase motivadora para mim...";
        
        // Verifique se a função getContent está sendo chamada corretamente
        const data = await getContent('frase motivacional', prompt, 'phrases', 'phrase');
        
        console.log('Dados recebidos do banco de dados:', data); // Log para ver o retorno
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Erro detalhado na função get-motivation:', error); // Log o erro completo
        res.status(500).json({
            error: 'Erro no servidor. Verifique os logs do Vercel para mais detalhes.'
        });
    }
}