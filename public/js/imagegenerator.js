document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    // const aspectRatioSelect = document.getElementById('aspectRatioSelect'); // Não necessário para esta função Gemini
    const generateBtn = document.getElementById('generateBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    // const generatedImage = document.getElementById('generatedImage'); // Não é uma imagem direta
    // const imagePlaceholder = document.getElementById('imagePlaceholder'); // Não é uma imagem direta

    // Novo elemento para exibir o prompt gerado pelo Gemini
    const generatedPromptOutput = document.createElement('p');
    generatedPromptOutput.id = 'generatedPromptOutput';
    generatedPromptOutput.style.whiteSpace = 'pre-wrap'; // Preserva quebras de linha
    generatedPromptOutput.style.textAlign = 'left';
    generatedPromptOutput.style.backgroundColor = '#f0f0f0';
    generatedPromptOutput.style.padding = '15px';
    generatedPromptOutput.style.borderRadius = '5px';
    generatedPromptOutput.style.marginTop = '20px';
    generatedPromptOutput.style.display = 'none'; // Esconde por padrão
    
    // Adicione o novo elemento ao DOM, por exemplo, após o botão
    generateBtn.parentNode.insertBefore(generatedPromptOutput, generateBtn.nextSibling);

    // Adapte a URL da sua Netlify Function para o novo nome do arquivo
    const FUNCTION_URL = '/.netlify/functions/generate-vertex-image'; 

    generateBtn.addEventListener('click', async () => {
        const basePrompt = promptInput.value.trim();
        // const aspectRatio = aspectRatioSelect.value; // Não necessário para esta função Gemini

        // Limpa mensagens de erro e resultados anteriores
        errorMessage.textContent = '';
        generatedPromptOutput.textContent = '';
        generatedPromptOutput.style.display = 'none';

        if (!basePrompt) {
            errorMessage.textContent = 'Por favor, insira uma ideia base para gerar o prompt.';
            return;
        }

        // Desabilita o botão e mostra o spinner
        generateBtn.disabled = true;
        loadingSpinner.style.display = 'block';
        // Atualiza o placeholder ou mensagem de status
        // Se você removeu os elementos de imagem, pode exibir uma mensagem aqui
        // Ex: imagePlaceholder.textContent = 'Gerando prompt detalhado com Gemini...';


        try {
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ basePrompt }), // Envia o prompt base
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
                throw new Error(errorData.error || `Falha ao conectar com a função Netlify. Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.detailedImagePrompt) {
                generatedPromptOutput.textContent = `Prompt Detalhado Gerado pelo Gemini:\n\n${data.detailedImagePrompt}`;
                generatedPromptOutput.style.display = 'block'; // Mostra o prompt
            } else {
                errorMessage.textContent = 'Nenhum prompt detalhado foi retornado pelo Gemini.';
            }

        } catch (error) {
            console.error('Erro ao chamar a função Netlify:', error);
            errorMessage.textContent = `Erro: ${error.message}. Por favor, tente novamente.`;
        } finally {
            // Reabilita o botão e esconde o spinner
            generateBtn.disabled = false;
            loadingSpinner.style.display = 'none';
        }
    });
});