// utils/db.js
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuração do Banco de Dados PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para conexão com alguns provedores de DB como o Cyclic/Neon
    }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TWO_DAYS_IN_MILLIS = 2 * 24 * 60 * 60 * 1000; // 2 dias em milissegundos

// Função para inicializar o DB (chame uma vez em cada função que precisar dela)
async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado ao banco de dados PostgreSQL.');

        // Cria a tabela phrases
        await client.query(`
            CREATE TABLE IF NOT EXISTS phrases (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                last_updated BIGINT NOT NULL
            );
        `);
        console.log('Tabela phrases verificada/criada.');

        // Cria a tabela tips
        await client.query(`
            CREATE TABLE IF NOT EXISTS tips (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                last_updated BIGINT NOT NULL
            );
        `);
        console.log('Tabela tips verificada/criada.');

    } catch (err) {
        console.error('Erro ao conectar ou inicializar o banco de dados:', err.message);
        throw err; // Relança o erro para a função que chamou
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Função genérica para buscar/gerar/salvar conteúdo
async function getContent(type, prompt, tableName, contentKey) {
    let client;
    try {
        await initializeDatabase(); // Garante que as tabelas existem (chame uma vez por função)
        client = await pool.connect();

        const result = await client.query(`SELECT content, last_updated FROM ${tableName} ORDER BY last_updated DESC LIMIT 1`);
        const row = result.rows[0];

        const now = Date.now();
        let contentToReturn;

        if (row && (now - row.last_updated < TWO_DAYS_IN_MILLIS)) {
            console.log(`Servindo ${type} do DB (última atualização: ${new Date(row.last_updated).toLocaleString()}).`);
            contentToReturn = row.content;
        } else {
            console.log(`Gerando novo ${type} (expirado ou não existente).`);
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const geminiResult = await model.generateContent(prompt);
                const response = await geminiResult.response;
                const generatedContent = response.text().trim();

                await client.query(`DELETE FROM ${tableName};`);
                await client.query(`INSERT INTO ${tableName} (content, last_updated) VALUES ($1, $2);`,
                    [generatedContent, now]
                );
                console.log(`Novo ${type} salvo no DB.`);
                contentToReturn = generatedContent;

            } catch (error) {
                console.error(`Erro ao chamar a API do Google Gemini para ${type}:`, error);
                if (row && row.content) {
                    console.warn(`Erro na API Gemini para ${type}, servindo conteúdo antigo do DB.`);
                    contentToReturn = row.content;
                } else {
                    throw new Error(`Erro ao gerar ${type}.`);
                }
            }
        }
        return { [contentKey]: contentToReturn };

    } catch (err) {
        console.error(`Erro na função getContent para ${type}:`, err.message);
        throw { statusCode: 500, message: `Erro interno do servidor ao processar ${type}.` };
    } finally {
        if (client) {
            client.release();
        }
    }
}

module.exports = {
    getContent
  
};
