// Arquivo: netlify/functions/produto.js

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
    const client = new Client({
        connectionString: process.env.NETLIFY_DATABASE_URL,
    });

    // Conexão com o Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
                const dataPost = JSON.parse(body);
                const { nome, classificacao: postClassificacao, link, preco, base64Image } = dataPost;

                let imageUrl = null;
                if (base64Image) {
                    const imageBuffer = Buffer.from(base64Image, 'base64');
                    const filename = `produtos/${uuidv4()}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('produtos') // Substitua 'produtos' pelo nome do seu bucket no Supabase
                        .upload(filename, imageBuffer, {
                            contentType: 'image/jpg'
                        });

                    if (uploadError) {
                        throw uploadError;
                    }

                    // Obtém a URL pública do Supabase Storage
                    const { data: publicUrlData } = supabase.storage
                        .from('produtos')
                        .getPublicUrl(filename);
                        
                    imageUrl = publicUrlData.publicUrl;
                }

                const resPost = await client.query(
                    'INSERT INTO produtos (nome, classificacao, link, preco, imagem_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [nome, postClassificacao, link, preco, imageUrl]
                );
                response = { statusCode: 201, body: JSON.stringify(resPost.rows[0]) };
                break;

            case 'PUT':
                if (id && !isNaN(id)) {
                    const dataPut = JSON.parse(body);
                    const { nome: nomePut, classificacao: classificacaoPut, link: linkPut, preco: precoPut, base64Image: base64ImagePut } = dataPut;

                    let imageUrlPut = null;
                    if (base64ImagePut) {
                        // Deleta a imagem antiga do Supabase Storage
                        const resOldImage = await client.query('SELECT imagem_url FROM produtos WHERE id = $1', [id]);
                        if (resOldImage.rows.length > 0 && resOldImage.rows[0].imagem_url) {
                            const oldImageUrl = resOldImage.rows[0].imagem_url;
                            const oldFilename = oldImageUrl.split('/').pop(); // Extrai o nome do arquivo da URL
                            await supabase.storage.from('produtos').remove([`produtos/${oldFilename}`]);
                        }

                        // Faz upload da nova imagem
                        const imageBuffer = Buffer.from(base64ImagePut, 'base64');
                        const newFilename = `produtos/${uuidv4()}.jpg`;
                        const { error: uploadError } = await supabase.storage
                            .from('produtos')
                            .upload(newFilename, imageBuffer, {
                                contentType: 'image/jpg'
                            });

                        if (uploadError) {
                            throw uploadError;
                        }

                        const { data: publicUrlData } = supabase.storage
                            .from('produtos')
                            .getPublicUrl(newFilename);
                            
                        imageUrlPut = publicUrlData.publicUrl;
                    }

                    const resPut = await client.query(
                        `UPDATE produtos SET nome = $1, classificacao = $2, link = $3, preco = $4 ${imageUrlPut ? ', imagem_url = $5' : ''} WHERE id = $${imageUrlPut ? 6 : 5} RETURNING *`,
                        imageUrlPut ? [nomePut, classificacaoPut, linkPut, precoPut, imageUrlPut, id] : [nomePut, classificacaoPut, linkPut, precoPut, id]
                    );
                    response = { statusCode: 200, body: JSON.stringify(resPut.rows[0]) };
                } else {
                    response = { statusCode: 400, body: 'ID do produto não fornecido.' };
                }
                break;

            case 'DELETE':
                if (id && !isNaN(id)) {
                    // Deleta a imagem do Supabase Storage antes de deletar o registro
                    const resImage = await client.query('SELECT imagem_url FROM produtos WHERE id = $1', [id]);
                    if (resImage.rows.length > 0 && resImage.rows[0].imagem_url) {
                        const imageUrlToDelete = resImage.rows[0].imagem_url;
                        const filenameToDelete = imageUrlToDelete.split('/').pop();
                        await supabase.storage.from('produtos').remove([`produtos/${filenameToDelete}`]);
                    }
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
        console.error('Erro no banco de dados ou no Supabase:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor' }),
        };
    } finally {
        await client.end();
    }
};