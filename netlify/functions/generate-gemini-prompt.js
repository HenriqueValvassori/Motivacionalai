// index.js (para Google Cloud Function - Usando Google Gemini Pro para gerar prompts de imagem)

// Importa a biblioteca do Google Generative AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configurações do Google Cloud e Gemini API ---
// Sua Chave da API Gemini.
// Para uso em Google Cloud Functions, é recomendável configurar isso como uma variável de ambiente.
// Você pode obter uma chave de API no Google AI Studio (ai.google.dev) ou no Google Cloud Console.
const API_KEY = process.env.GEMINI_API_KEY; 

// Inicializa o cliente Gemini
let genAI;
try {
    genAI = new GoogleGenerativeAI(API_KEY);
} catch (e) {
    console.error("Erro ao inicializar GoogleGenerativeAI:", e.message);
    // Este erro geralmente acontece se a API_KEY estiver faltando ou for inválida.
    // Em ambientes GCF, se você estiver usando credenciais de conta de serviço padrão,
    // a API_KEY pode não ser necessária diretamente se a conta de serviço tiver as permissões adequadas
    // para a API Gemini (Generative Language API). No entanto, para uso direto da API Key, ela é crucial.
}

// O nome da sua função no Google Cloud Functions.
// Ex: ao implantar, você nomearia a função como 'generateCreativeImagePrompt'.
exports.generateCreativeImagePrompt = async (req, res) => {
    // --- Configuração de CORS (Essencial para chamadas de frontend) ---
    res.set('Access-Control-Allow-Origin', '*'); // Ajuste para domínios específicos em produção!

    // Lida com requisições OPTIONS (preflight CORS)
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600'); 
        return res.status(204).send(''); 
    }

    // --- Validação Inicial da API Key e Cliente ---
    if (!API_KEY) {
        console.error("Erro: GEMINI_API_KEY não configurado nas variáveis de ambiente da GCF.");
        return res.status(500).json({ error: 'Chave da API Gemini não configurada. Por favor, adicione-a como variável de ambiente.' });
    }
    if (!genAI) {
        return res.status(500).json({ error: 'Falha na inicialização do cliente da API Gemini. Verifique a chave da API.' });
    }

    let requestBody;
    try {
        requestBody = req.body; 
    } catch (error) {
        return res.status(400).json({ error: 'Corpo da requisição inválido. Esperado JSON.' });
    }

    // O prompt base que o usuário fornece (ex: "um gato espacial fofo")
    const { basePrompt } = requestBody; 

    if (!basePrompt || typeof basePrompt !== 'string' || basePrompt.trim() === '') {
        return res.status(400).json({ error: 'O "basePrompt" é obrigatório e deve ser uma string não vazia.' });
    }

    try {
        // --- Usa o modelo Gemini Pro para gerar texto ---
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // "gemini-pro" é para geração de texto

        // Cria uma instrução para o Gemini gerar um prompt de imagem detalhado.
        // Você pode ajustar esta instrução (system prompt) para o estilo que desejar.
        const fullPrompt = `Gere um prompt altamente detalhado e criativo (no máximo 150 palavras) para uma IA de geração de imagens, baseado na seguinte ideia: "${basePrompt}". Inclua especificações de estilo artístico (ex: fotorrealista, cyberpunk, aquarela), cores predominantes, tipo de iluminação, composição da cena, e a descrição dos elementos principais.`;

        console.log(`[GCF - Gemini] Solicitando ao Gemini para expandir o prompt: "${basePrompt}"`);
        
        // Faz a chamada à API Gemini
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const generatedImagePrompt = response.text(); // A saída do Gemini é texto!

        if (!generatedImagePrompt || generatedImagePrompt.trim() === '') {
            console.error("[GCF - Gemini] Nenhuma descrição de imagem gerada pelo Gemini.");
            return res.status(500).json({ error: "O Gemini não conseguiu gerar uma descrição detalhada de imagem para o seu prompt." });
        }

        console.log("[GCF - Gemini] Descrição de imagem gerada com sucesso pelo Gemini.");
        
        // --- Retorna a DESCRIÇÃO DE TEXTO gerada pelo Gemini ---
        // Esta descrição textual precisaria ser enviada para outra API (como o Vertex AI Imagen, Replicate, DALL-E)
        // para, então, gerar a imagem real.
        return res.status(200).json({ detailedImagePrompt: generatedImagePrompt }); 

    } catch (error) {
        console.error('[GCF - Gemini] Erro ao chamar o modelo Gemini Pro:', error);
        // Erros da API Gemini podem ser detalhados (ex: cota excedida, chave inválida)
        return res.status(500).json({ error: `Erro interno ao gerar prompt com Gemini: ${error.message}` });
    }
};