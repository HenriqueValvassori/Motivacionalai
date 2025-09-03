// Arquivo: netlify/functions/index.js

const express = require('express');
const app = express();
const cors = require('cors');

// Importa suas outras funções
const getMotivation = require('./get-motivation');
const getTrainingTips = require('./get-training-tips');
const generateImage = require('./generate-image-gemini');
const indexNow = require('./indexnow');

// Middleware para habilitar CORS
app.use(cors());
app.use(express.json());

// Mapeia suas funções para as rotas da API
app.get('/api/get-motivation', getMotivation);
app.get('/api/get-training-tips', getTrainingTips);
app.get('/api/generate-image-gemini', generateImage);
app.get('/api/indexnow', indexNow);

// Exporta o app do Express como o handler da função Netlify/Vercel
module.exports = app;