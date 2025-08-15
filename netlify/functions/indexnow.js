// server.js

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); // Para permitir requisições do seu frontend

const app = express();
const port = process.env.PORT || 3000;

// Substitua esta chave pela sua chave real da IndexNow
const INDEXNOW_API_KEY = '0ed9c134d44d462bba5922134f2d2184'; 
// Substitua este URL pelo local do arquivo .txt da sua chave no seu site
const KEY_LOCATION = 'https://blogmotivacionalai.netlify.app/0ed9c134d44d462bba5922134f2d2184.txt';

app.use(express.json()); // Habilita o parsing de JSON no corpo da requisição
app.use(cors()); // Permite que seu frontend em Netlify se conecte

// Endpoint para receber a requisição do front-end
app.post('/api/indexnow', async (req, res) => {
    const { urlList } = req.body;
    
    if (!urlList || !Array.isArray(urlList) || urlList.length === 0) {
        return res.status(400).json({ error: 'A lista de URLs é obrigatória.' });
    }

    const data = {
        host: "blogmotivacionalai.netlify.app",
        key: INDEXNOW_API_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urlList
    };

    try {
        const response = await fetch('https://api.indexnow.org/IndexNow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('URLs enviados com sucesso via IndexNow.');
            return res.status(200).json({ message: 'URLs enviados com sucesso.' });
        } else {
            const errorText = await response.text();
            console.error('Erro na resposta da API IndexNow:', response.status, errorText);
            return res.status(response.status).json({ error: 'Erro na API do IndexNow.' });
        }
    } catch (error) {
        console.error('Erro na requisição para IndexNow:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});