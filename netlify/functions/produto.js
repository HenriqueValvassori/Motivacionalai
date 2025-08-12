// Arquivo: netlify/functions/produto.js

const { Client } = require('pg');
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    // Adicionando um log para indicar o início da função
    console.log('Início da função produto.js');
    console.log('Método HTTP:', event.httpMethod);

    const client = new Client({
        connectionString: process.env.NETLIFY_DATABASE_URL,
    });

    try {
        console.log('Tentando conectar ao banco de dados...');
        await client.connect();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        const { httpMethod, path, body, queryStringParameters } = event;
        const segments = path.split('/').filter(Boolean);
        const id = segments[segments.length - 1];

        const blobs = getStore({ name: 'produtos' });
        console.log('Netlify Blobs store "produtos" acessada.');

        let response;

        switch (httpMethod) {
            case 'GET':
                console.log('Método GET detectado.');
                const classificacao = queryStringParameters.classificacao;
                let query = 'SELECT * FROM produtos';
                let values = [];
                if (classificacao && classificacao !== 'todos') {
                    query += ' WHERE classificacao = $1';
                    values.push(classificacao);
                    console.log('Filtro por classificação ativado:', classificacao);
                }
                
                console.log('Executando consulta SQL:', query, 'com valores:', values);
                const res = await client.query(query, values);
                console.log('Consulta executada com sucesso. Número de linhas retornadas:', res.rows.length);
                response = { statusCode: 200, body: JSON.stringify(res.rows) };
                break;

            case 'POST':
                console.log('Método POST detectado.');
                const dataPost = JSON.parse(body);
                console.log('Dados recebidos para POST:', dataPost);
                const { nome, classificacao: postClassificacao, link, preco, base64Image } = dataPost;

                let blobPath = null;
                if (base64Image) {
                    console.log('Imagem em Base64 encontrada. Iniciando upload para o Blob.');
                    const imageData = Buffer.from(base64Image, 'base64');
                    const filename = `${Date.now()}-${nome.replace(/\s/g, '-')}.png`;
                    const { path: newBlobPath } = await blobs.set(filename, imageData);
                    blobPath = newBlobPath;
                    console.log('Imagem salva no Blob com sucesso. URL:', blobPath);
                }

                console.log('Inserindo produto no banco de dados...');
                const resPost = await client.query(
                    'INSERT INTO produtos (nome, classificacao, link, preco, imagem_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [nome, postClassificacao, link, preco, blobPath]
                );
                console.log('Produto inserido com sucesso:', resPost.rows[0].id);
                response = { statusCode: 201, body: JSON.stringify(resPost.rows[0]) };
                break;

            case 'PUT':
                console.log('Método PUT detectado para o ID:', id);
                if (id && !isNaN(id)) {
                    const dataPut = JSON.parse(body);
                    console.log('Dados recebidos para PUT:', dataPut);
                    const { nome: nomePut, classificacao: classificacaoPut, link: linkPut, preco: precoPut, base64Image: base64ImagePut } = dataPut;

                    let blobPathPut = null;
                    if (base64ImagePut) {
                        console.log('Nova imagem em Base64 encontrada. Iniciando upload para o Blob.');
                        const imageDataPut = Buffer.from(base64ImagePut, 'base64');
                        const filenamePut = `${Date.now()}-${nomePut.replace(/\s/g, '-')}.png`;
                        const { path: newBlobPathPut } = await blobs.set(filenamePut, imageDataPut);
                        blobPathPut = newBlobPathPut;
                        console.log('Nova imagem salva no Blob com sucesso. URL:', blobPathPut);
                    }

                    console.log('Atualizando produto no banco de dados...');
                    const resPut = await client.query(
                        `UPDATE produtos SET nome = $1, classificacao = $2, link = $3, preco = $4 ${blobPathPut ? ', imagem_url = $5' : ''} WHERE id = $${blobPathPut ? 6 : 5} RETURNING *`,
                        blobPathPut ? [nomePut, classificacaoPut, linkPut, precoPut, blobPathPut, id] : [nomePut, classificacaoPut, linkPut, precoPut, id]
                    );
                    console.log('Produto atualizado com sucesso:', resPut.rows[0].id);
                    response = { statusCode: 200, body: JSON.stringify(resPut.rows[0]) };
                } else {
                    console.log('ID do produto não fornecido para o PUT.');
                    response = { statusCode: 400, body: 'ID do produto não fornecido.' };
                }
                break;

            case 'DELETE':
                console.log('Método DELETE detectado para o ID:', id);
                if (id && !isNaN(id)) {
                    console.log('Buscando a URL da imagem para o ID:', id);
                    const resBlob = await client.query('SELECT imagem_url FROM produtos WHERE id = $1', [id]);
                    if (resBlob.rows.length > 0) {
                        const blobToDeletePath = resBlob.rows[0].imagem_url;
                        if (blobToDeletePath) {
                            console.log('URL da imagem encontrada. Tentando deletar do Blob:', blobToDeletePath);
                            await blobs.delete(blobToDeletePath);
                            console.log('Imagem deletada do Blob com sucesso.');
                        }
                    }
                    console.log('Deletando produto do banco de dados...');
                    await client.query('DELETE FROM produtos WHERE id = $1', [id]);
                    console.log('Produto deletado com sucesso do banco de dados.');
                    response = { statusCode: 204, body: '' };
                } else {
                    console.log('ID do produto não fornecido para o DELETE.');
                    response = { statusCode: 400, body: 'ID do produto não fornecido.' };
                }
                break;

            default:
                console.log('Método não permitido:', httpMethod);
                response = { statusCode: 405, body: 'Método não permitido.' };
        }
        return response;
    } catch (error) {
        console.error('*** Erro Crítico na Função! Detalhes abaixo: ***');
        console.error('Mensagem de Erro:', error.message);
        console.error('Objeto de Erro Completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor' }),
        };
    } finally {
        console.log('Fechando conexão com o banco de dados.');
        await client.end();
        console.log('Fim da função.');
    }
};