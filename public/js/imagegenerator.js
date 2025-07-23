document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const aspectRatioSelect = document.getElementById('aspectRatioSelect');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const generatedImage = document.getElementById('generatedImage');
    const imagePlaceholder = document.getElementById('imagePlaceholder');

    // Define a URL da sua Netlify Function.
    // Lembre-se que o nome da função no backend deve ser o mesmo do caminho aqui.
    // Ex: Se sua função é 'generate-replicate-image.js', a URL será '/.netlify/functions/generate-replicate-image'
    const FUNCTION_URL = '/.netlify/functions/generate-replicate-image'; 

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const aspectRatio = aspectRatioSelect.value;

        // Limpa mensagens de erro e esconde a imagem anterior
        errorMessage.textContent = '';
        generatedImage.style.display = 'none';
        imagePlaceholder.style.display = 'block'; // Mostra o placeholder novamente
        generatedImage.src = ''; // Limpa o src da imagem anterior

        if (!prompt) {
            errorMessage.textContent = 'Por favor, insira um prompt para gerar a imagem.';
            return;
        }

        // Desabilita o botão e mostra o spinner
        generateBtn.disabled = true;
        loadingSpinner.style.display = 'block';
        imagePlaceholder.textContent = 'Gerando sua imagem... Por favor, aguarde.';

        try {
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }), // Envia o prompt e o aspect_ratio
            });

            if (!response.ok) {
                // Se a resposta não for OK (status 4xx ou 5xx)
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
                throw new Error(errorData.error || 'Falha ao conectar com a função Netlify.');
            }

            const data = await response.json();

            if (data.imageUrl) {
                generatedImage.src = data.imageUrl;
                generatedImage.style.display = 'block'; // Mostra a imagem
                imagePlaceholder.style.display = 'none'; // Esconde o placeholder
            } else {
                errorMessage.textContent = 'Nenhuma URL de imagem foi retornada.';
            }

        } catch (error) {
            console.error('Erro ao chamar a função Netlify:', error);
            errorMessage.textContent = `Erro: ${error.message}. Por favor, tente novamente.`;
            imagePlaceholder.style.display = 'block'; // Mostra o placeholder se houver erro
            imagePlaceholder.textContent = 'Ocorreu um erro ao gerar a imagem.';
        } finally {
            // Reabilita o botão e esconde o spinner
            generateBtn.disabled = false;
            loadingSpinner.style.display = 'none';
        }
    });
});