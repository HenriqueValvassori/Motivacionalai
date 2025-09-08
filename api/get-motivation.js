// api/get-motivation.js
import { Client } from 'pg';

export default async function (req, res) {
    const DATABASE_URL = process.env.NETLIFY_DATABASE_URLABASE_URL se você mantiver o nome
    
    // Verificação de segurança: se a variável de ambiente não existir, a função falha.
    if (!DATABASE_URL) {
        console.error('DATABASE_URL não está configurada nas variáveis de ambiente do Vercel.');
        return res.status(500).json({ error: 'Erro de configuração do servidor.' });
    }

    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            // Essa opção é crucial para o Neon em ambientes de produção
            // Ela permite que o Vercel se conecte de forma segura
            rejectUnauthorized: false
        }
    });

    try {
        console.log("Tentando conectar ao banco de dados Neon...");
        await pgClient.connect();
        console.log("Conectado com sucesso ao Neon!");
        
        // Aqui deve entrar a sua lógica de buscar os dados da IA
        // A sua lógica anterior deve estar correta, desde que a conexão funcione
        const prompt = "Crie uma frase motivadora para mim...";
        const data = await // sua chamada para a IA e para o banco de dados

        res.status(200).json({ data }); // Retorna a resposta da sua API
    } catch (error) {
        // Agora o erro capturado será mais específico
        console.error('Erro na função de API:', error);
        res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    } finally {
        await pgClient.end();
        console.log("Conexão com o banco de dados fechada.");
    }
}