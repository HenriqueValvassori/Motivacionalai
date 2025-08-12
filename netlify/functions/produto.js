// Arquivo: netlify/functions/produto.js

const { Client } = require('pg');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const client = new Client({
        connectionString: process.env.NETLIFY_DATABASE_URL,
    });

    try {
        await client.connect();
        const { httpMethod, path, body, queryStringParameters } = event;
        const segments = path.split('/').filter(Boolean);
        const id = segments[segments.length - 1];

        let response;

        switch (httpMethod) {
            case 'GET':
                const classificacao = queryStringParameters.classificacao;
                let query = 'SELECT * FROM produtos';
                let values = [];
                if (classificacao && classificacao !== 'todos') {
                    query += ' WHERE classificacao = $1';
                    values.push(classificacao);
                }
                const res = await client.query(query, values);
                response = { statusCode: 200, body: JSON.stringify(res.rows) };
                break;

            case 'POST':
                const data = JSON.parse(body);
                const { nome, classificacao: postClassificacao, link, preco, imagemUrl } = data;
                const resPost = await client.query(
                    'INSERT INTO produtos (nome, classificacao, link, preco, imagem_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [nome, postClassificacao, link, preco, imagemUrl]
                );
                response = { statusCode: 201, body: JSON.stringify(resPost.rows[0]) };
                break;

            case 'PUT':
                if (id && !isNaN(id)) {
                    const dataPut = JSON.parse(body);
                    const { nome: nomePut, classificacao: classificacaoPut, link: linkPut, preco: precoPut, imagemUrl: imagemUrlPut } = dataPut;
                    const resPut = await client.query(
                        'UPDATE produtos SET nome = $1, classificacao = $2, link = $3, preco = $4, imagem_url = $5 WHERE id = $6 RETURNING *',
                        [nomePut, classificacaoPut, linkPut, precoPut, imagemUrlPut, id]
                    );
                    response = { statusCode: 200, body: JSON.stringify(resPut.rows[0]) };
                } else {
                    response = { statusCode: 400, body: 'ID do produto não fornecido.' };
                }
                break;

            case 'DELETE':
                if (id && !isNaN(id)) {
                    await client.query('DELETE FROM produtos WHERE id = $1', [id]);
                    response = { statusCode: 204, body: '' };
                } else {
                    response = { statusCode: 400, body: 'ID do produto não fornecido.' };
                }
                break;

            default:
                response = { statusCode: 405, body: 'Método não permitido.' };
        }

        return response;
    } catch (error) {
        console.error('Erro no banco de dados:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor' }),
        };
    } finally {
        await client.end();
    }
};