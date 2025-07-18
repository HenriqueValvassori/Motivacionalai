// js/motivation-app.js

document.addEventListener('DOMContentLoaded', async () => {
    const fraseMotivadoraElement = document.getElementById('fraseMotivadora');
    const trainingTipsElement = document.getElementById('trainingTipsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Função para buscar a frase motivacional
    async function fetchMotivationPhrase() {
        fraseMotivadoraElement.textContent = 'Carregando sua frase...';
        loadingMessage.style.display = 'block'; // Mostra "Gerando..."
        errorMessage.style.display = 'none'; // Esconde mensagens de erro anteriores
        try {
            const response = await fetch('/.netlify/functions/get-motivation');
            if (!response.ok) {
                // Tenta ler o erro do corpo da resposta, se disponível
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            // Supondo que a API retorna um objeto como { phrase: "Sua frase aqui" }
            fraseMotivadoraElement.textContent = data.phrase || 'Não foi possível gerar a frase.';
        } catch (error) {
            console.error('Erro ao buscar frase motivacional:', error);
            fraseMotivadoraElement.textContent = 'Erro ao carregar a frase.';
            errorMessage.textContent = `Erro: ${error.message}`;
            errorMessage.style.display = 'block'; // Mostra a mensagem de erro
        } finally {
            loadingMessage.style.display = 'none'; // Esconde "Gerando..."
        }
    }

    // Função para buscar as dicas de treino
    async function fetchTrainingTips() {
        trainingTipsElement.textContent = 'Carregando dicas de treino...';
        try {
            const response = await fetch('/.netlify/functions/get-training-tips');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            // Supondo que a API retorna um objeto como { tips: "Suas dicas aqui" }
            trainingTipsElement.textContent = data.tips || 'Não foi possível carregar as dicas de treino.';
        } catch (error) {
            console.error('Erro ao buscar dicas de treino:', error);
            trainingTipsElement.textContent = 'Erro ao carregar dicas de treino.';
        }
    }

    // Chame as funções ao carregar a página
    fetchMotivationPhrase();
    fetchTrainingTips();
});