// js/imageConverter.js

// 1. Definição da função de inicialização do Conversor de Imagens
// Esta função encapsula toda a lógica de configuração do conversor (event listeners, etc.).
function initializeImageConverter() {
    console.log('Image Converter: Inicializando funcionalidade...');

    const imageInput = document.getElementById('imageInput');
    const imageFormatSelect = document.getElementById('imageFormat');
    const convertImageBtn = document.getElementById('convertImageBtn');
    const outputImage = document.getElementById('outputImage');
    const downloadLink = document.getElementById('downloadLink');

    // **IMPORTANTE:** Verificar se os elementos existem antes de adicionar listeners.
    // Isso é crucial se a seção do conversor estiver inicialmente oculta (display: none)
    // e for mostrada apenas após um clique.
    if (!imageInput || !imageFormatSelect || !convertImageBtn || !outputImage || !downloadLink) {
        console.warn('Image Converter: Nem todos os elementos HTML necessários foram encontrados no DOM. ' +
                     'A funcionalidade do conversor pode não ser ativada corretamente. ' +
                     'Certifique-se de que a seção do conversor existe no HTML e que os IDs estão corretos.');
        return; // Sai da função se os elementos não forem encontrados
    }

    // Adiciona o listener de clique ao botão de conversão
    convertImageBtn.addEventListener('click', () => {
        const file = imageInput.files[0];
        if (!file) {
            alert('Por favor, selecione uma imagem para converter.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const format = imageFormatSelect.value;
                let mimeType;
                switch (format) {
                    case 'png':
                        mimeType = 'image/png';
                        break;
                    case 'jpeg':
                        mimeType = 'image/jpeg';
                        break;
                    case 'webp':
                        mimeType = 'image/webp';
                        break;
                    default:
                        mimeType = 'image/png'; // Padrão
                }

                // Adicionado verificação de suporte a WebP para maior robustez
                if (format === 'webp' && !canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
                    alert('Seu navegador não suporta o formato WebP para conversão.');
                    return;
                }

                const imageDataUrl = canvas.toDataURL(mimeType);
                outputImage.src = imageDataUrl;
                outputImage.style.display = 'block'; // Mostra a imagem de saída
                
                downloadLink.href = imageDataUrl;
                downloadLink.download = `converted_image.${format}`;
                downloadLink.textContent = `Baixar como ${format.toUpperCase()}`;
                downloadLink.style.display = 'inline-block'; // Mostra o link de download
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}


// 2. Lógica principal do DOMContentLoaded que integra o redirecionamento e a ativação do conversor
document.addEventListener('DOMContentLoaded', () => {
    // ID do botão que controlará o redirecionamento/ativação
    const buttonId = 'viewPdfBtn';
    const button = document.getElementById(buttonId);

    if (button) {
        const hasRedirectedKey = 'hasRedirectedForButtonX'; // Chave para localStorage
        // Defina SUA PÁGINA DE ESCOLHA AQUI
        // Exemplo: 'https://seusite.com/pagina-de-boas-vindas.html' ou 'outra_pagina.html'
        const firstRedirectPage = 'https://www.google.com'; // <--- **MUDE ESTA URL PARA A PÁGINA DESEJADA**

        // ID da seção HTML que contém o conversor de imagens.
        // É importante que essa seção exista na página e possa ser mostrada/ocultada.
        const converterSectionId = 'image-converter-section';

        // Esta função será executada quando o botão for clicado e o primeiro redirecionamento já tiver ocorrido.
        const activateConverterFunction = () => {
            console.log('Comportamento padrão: Ativando a funcionalidade do conversor de imagens na página.');

            // Tenta mostrar a seção do conversor de imagens, se estiver oculta
            const converterSection = document.getElementById(converterSectionId);
            if (converterSection) {
                converterSection.style.display = 'block'; // Torna a seção visível
                // Opcional: Rola a página para a seção do conversor para uma melhor experiência do usuário
                converterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn(`Seção do conversor com ID '${converterSectionId}' não encontrada. A funcionalidade pode não ser visível.`);
            }

            // Chama a função de inicialização do conversor definida acima.
            initializeImageConverter();
        };

        button.addEventListener('click', (event) => {
            event.preventDefault(); // Previne o comportamento padrão do botão

            const hasRedirected = localStorage.getItem(hasRedirectedKey);

            if (!hasRedirected) {
                // Primeira vez: Redireciona para a URL de sua escolha
                localStorage.setItem(hasRedirectedKey, 'true'); // Marca que o redirecionamento já aconteceu
                window.location.href = firstRedirectPage; // Executa o redirecionamento
            } else {
                // Próximas vezes: Executa a função de ativação do conversor
                console.log('Primeiro redirecionamento já ocorreu. Ativando o conversor.');
                activateConverterFunction();
            }
        });
    } else {
        console.warn(`Botão com ID '${buttonId}' não encontrado. O script de redirecionamento condicional não será ativado.`);
    }

    // Opcional: Para o rodapé, se você quiser atualizar o ano dinamicamente.
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});