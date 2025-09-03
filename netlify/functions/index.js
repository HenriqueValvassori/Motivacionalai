// Arquivo: netlify/functions/index.js
import { inject } from "@vercel/analytics";
inject();
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();
const express = require('express');
const app = express();
const cors = require('cors');

// Importa todas as suas funções
const convertFile = require('./convertFile');
const generateNews = require('./generate-news');
const generateTrainingTips = require('./generate-training-tips');
const getMotivation = require('./get-motivation');
const getNews = require('./get-news');
const getTrainingTips = require('./get-training-tips');
const getTrainingTipss = require('./get-training-tipss'); // Verifique a duplicidade no nome
const produto = require('./produto');

// Middleware para habilitar CORS
app.use(cors());
app.use(express.json());

// Mapeia cada função para sua respectiva rota da API
// Certifique-se de que cada uma dessas rotas corresponda a uma requisição no seu front-end
app.get('/api/convertFile', convertFile);
app.get('/api/generate-news', generateNews);
app.get('/api/generate-training-tips', generateTrainingTips);
app.get('/api/get-motivation', getMotivation);
app.get('/api/get-news', getNews);
app.get('/api/get-training-tips', getTrainingTips);
app.get('/api/get-training-tipss', getTrainingTipss);
app.get('/api/produto', produto);

// Exporta o aplicativo Express para ser usado pelo Vercel como sua Serverless Function
module.exports = app;