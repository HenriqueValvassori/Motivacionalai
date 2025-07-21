// public/js/training-tips-app.js
document.addEventListener('DOMContentLoaded', async () => {
    const trainingTipsContentElement = document.getElementById('trainingTipsContent');
    const trainingTipsErrorMessageElement = document.getElementById('trainingTipsErrorMessage'); // Adicionar um elemento de erro se quiser

    // Função para buscar e exibir a dica de treino
    async function fetchAndDisplayTrainingTip() {
        trainingTipsContentElement.innerHTML = '<p>Carregando dicas de treino...</p>';
        if (trainingTipsErrorMessageElement) {
            trainingTipsErrorMessageElement.style.display = 'none';
        }

        try {
            const response = await fetch('/.netlify/functions/get-training-tipss');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const tipData = await response.json();

            if (tipData && tipData.titulo && tipData.conteudo) {
                // Aqui você pode formatar como quiser. Exemplo:
                trainingTipsContentElement.innerHTML = `
                    <h2>${tipData.titulo}</h2>
                    <p>${tipData.conteudo.replace(/\n/g, '<br>')}</p>
                    <small>Última atualização: ${new Date(tipData.data_geracao).toLocaleDateString('pt-BR')} às ${new Date(tipData.data_geracao).toLocaleTimeString('pt-BR')}</small>
                `;
            } else {
                trainingTipsContentElement.innerHTML = '<p>Nenhuma dica de treino disponível no momento.</p><p>Por favor, volte mais tarde.</p>';
                if (trainingTipsErrorMessageElement) {
                    trainingTipsErrorMessageElement.textContent = 'Dados da dica de treino incompletos ou inexistentes.';
                    trainingTipsErrorMessageElement.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Erro ao buscar dica de treino:', error);
            trainingTipsContentElement.innerHTML = `<p>Não foi possível carregar a dica de treino no momento.</p>`;
            if (trainingTipsErrorMessageElement) {
                trainingTipsErrorMessageElement.textContent = `Erro: ${error.message}`;
                trainingTipsErrorMessageElement.style.display = 'block';
            }
        }
    }

    fetchAndDisplayTrainingTip();
});