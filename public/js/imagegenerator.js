// public/js/main.js

async function gerarImagemComIA(promptDoUsuario) {
    const loadingMessage = document.getElementById('loadingMessage');
    const imageDisplay = document.getElementById('imageDisplay');
    
    if (!promptDoUsuario) {
        alert('Por favor, insira um prompt para gerar a imagem.');
        return;
    }

    loadingMessage.textContent = 'Gerando imagem com IA... Isso pode levar um tempo.';
    imageDisplay.innerHTML = ''; // Limpa qualquer imagem anterior

    try {
        const response = await fetch('/.netlify/functions/generate-free-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptDoUsuario })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao gerar imagem.');
        }

        const result = await response.json();
        const imageUrlOrBase64 = result.imageUrl; // Pode ser URL ou Base64

        loadingMessage.textContent = ''; // Limpa a mensagem de carregamento
        imageDisplay.innerHTML = `<img src="${imageUrlOrBase64}" alt="${promptDoUsuario}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">`;

    } catch (error) {
        console.error('Erro ao chamar a API de geração de imagem:', error);
        loadingMessage.textContent = '';
        imageDisplay.innerHTML = `<p style="color: red;">Ocorreu um erro ao gerar a imagem: ${error.message}</p>`;
    }
}

// Exemplo de como você pode integrar isso com um input e um botão no seu HTML:
// <input type="text" id="promptInput" placeholder="Descreva a imagem..." style="width: 80%; padding: 10px;">
// <button id="generateButton" style="padding: 10px 20px; margin-top: 10px;">Gerar Imagem</button>
// <div id="loadingMessage" style="margin-top: 20px; color: blue;"></div>
// <div id="imageDisplay" style="margin-top: 20px;"></div>

document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const promptInput = document.getElementById('promptInput');

    if (generateButton && promptInput) {
        generateButton.addEventListener('click', () => {
            gerarImagemComIA(promptInput.value);
        });
    }
});