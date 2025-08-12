const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
  });

  try {
    await client.connect();
    const { httpMethod, path, body } = event;
    const segments = path.split('/').filter(Boolean);
    const id = segments[segments.length - 1]; // Captura o ID do produto da URL

    let response;

    switch (httpMethod) {
      case 'GET':
        // Lógica para buscar todos os produtos ou um produto específico por ID
        if (id && !isNaN(id)) {
          const res = await client.query('SELECT * FROM produtos WHERE id = $1', [id]);
          response = { statusCode: 200, body: JSON.stringify(res.rows[0]) };
        } else {
          const res = await client.query('SELECT * FROM produtos');
          response = { statusCode: 200, body: JSON.stringify(res.rows) };
        }
        break;

      case 'POST':
        // Lógica para cadastrar um novo produto
        const data = JSON.parse(body);
        const { nome, classificacao, link, preco, imagemUrl } = data; // Assumindo que a URL da imagem já foi processada
        const resPost = await client.query(
          'INSERT INTO produtos (nome, classificacao, link, preco, imagemUrl) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [nome, classificacao, link, preco, imagemUrl]
        );
        response = { statusCode: 201, body: JSON.stringify(resPost.rows[0]) };
        break;

      case 'PUT':
        // Lógica para editar um produto existente
        if (id && !isNaN(id)) {
          const dataPut = JSON.parse(body);
          const { nome: nomePut, classificacao: classificacaoPut, link: linkPut, preco: precoPut } = dataPut;
          const resPut = await client.query(
            'UPDATE produtos SET nome = $1, classificacao = $2, link = $3, preco = $4 WHERE id = $5 RETURNING *',
            [nomePut, classificacaoPut, linkPut, precoPut, id]
          );
          response = { statusCode: 200, body: JSON.stringify(resPut.rows[0]) };
        } else {
          response = { statusCode: 400, body: 'ID do produto não fornecido.' };
        }
        break;

      case 'DELETE':
        // Lógica para excluir um produto
        if (id && !isNaN(id)) {
          await client.query('DELETE FROM produtos WHERE id = $1', [id]);
          response = { statusCode: 204, body: '' }; // No Content
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