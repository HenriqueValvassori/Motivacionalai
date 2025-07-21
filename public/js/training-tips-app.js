// public/js/training-tips-app.js
document.addEventListener('DOMContentLoaded', async () => {
    const trainingTipsContentElement = document.getElementById('trainingTipsContent');
    const trainingTipsErrorMessageElement = document.getElementById('trainingTipsErrorMessage');

    // Função para buscar e exibir a(s) dica(s) de treino
    // Renomeada para deixar claro que agora busca TODAS
    async function fetchAndDisplayAllTrainingTips() {
        trainingTipsContentElement.innerHTML = '<p>Carregando dicas de treino...</p>';
        if (trainingTipsErrorMessageElement) {
            trainingTipsErrorMessageElement.style.display = 'none';
        }

        try {
            // CORREÇÃO 1: Nome da função Netlify (um 's' apenas)
            const response = await fetch('/.netlify/functions/get-training-tipss');

            if (!response.ok) {
                const errorData = await response.json();
                // A função get-training-tips.js retorna 404 se não houver dicas
                if (response.status === 404) {
                    throw new Error("Nenhuma dica de treino encontrada no banco de dados.");
                }
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            // CORREÇÃO 2: Esperamos um ARRAY de objetos aqui
            const allTips = await response.json(); 

            // Verifica se é um array e se tem itens
            if (allTips && Array.isArray(allTips) && allTips.length > 0) {
                trainingTipsContentElement.innerHTML = ''; // Limpa o "Carregando dicas de treino..."
                
                // Itera sobre CADA dica no array
                allTips.forEach(tip => {
                    const tipItem = document.createElement('div');
                    tipItem.className = 'tip-item'; // Para estilização via CSS, se quiser
                    tipItem.innerHTML = `
                        <h2>${tip.titulo}</h2>
                        <p>${tip.conteudo.replace(/\n/g, '<br>')}</p>
                        <small>Publicado em: ${new Date(tip.data_geracao).toLocaleDateString('pt-BR')} às ${new Date(tip.data_geracao).toLocaleTimeString('pt-BR')}</small>
                        <hr> `;
                    trainingTipsContentElement.appendChild(tipItem);
                });
            } else {
                // Se o array estiver vazio ou não for um array válido
                trainingTipsContentElement.innerHTML = '<p>Nenhuma dica de treino disponível no momento.</p><p>Por favor, volte mais tarde.</p>';
                if (trainingTipsErrorMessageElement) {
                    trainingTipsErrorMessageElement.textContent = 'Dados da dica de treino incompletos ou inexistentes.';
                    trainingTipsErrorMessageElement.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Erro ao buscar dicas de treino:', error);
            trainingTipsContentElement.innerHTML = `<p>Não foi possível carregar as dicas de treino no momento.</p>`;
            if (trainingTipsErrorMessageElement) {
                trainingTipsErrorMessageElement.textContent = `Erro: ${error.message}`;
                trainingTipsErrorMessageElement.style.display = 'block';
            }
        }
    }

    // Chama a nova função ao carregar a página
    fetchAndDisplayAllTrainingTips();
});