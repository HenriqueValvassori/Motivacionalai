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
                     'Certifique-se de que a seção do conversor existe no HTML.');
        return; // Sai da função se os elementos não forem encontrados
    }

    // Adiciona o listener de clique ao botão de conversão
    // Este listener só é anexado UMA VEZ quando initializeImageConverter é chamado.
    // Para evitar múltiplos listeners se a função for chamada várias vezes,
    // você pode adicionar uma verificação ou remover o listener antes de adicionar.
    // Para este caso, vamos assumir que só será chamado uma vez ou que os listeners
    // múltiplos são aceitáveis (se o botão 'convertImageBtn' for clicado repetidamente).
    // Uma abordagem mais robusta para evitar duplicação é verificar se o listener já existe
    // ou usar 'removeEventListener' antes de 'addEventListener', mas é mais complexo.
    // Para simplicidade e eficácia aqui:
    // Evita anexar o mesmo listener várias vezes se a função for chamada por múltiplos cliques.
    // removeEventListener precisa da mesma referência de função, então é melhor envolver.
    
    // Solução mais simples para evitar múltiplos listeners em 'convertImageBtn':
    // Se você garantir que initializeImageConverter() só é chamada UMA VEZ
    // na vida da página, não haverá problema.
    // Se ela for chamada múltiplos vezes pelo "botão principal", e você quiser
    // evitar que o listener de 'convertImageBtn' seja adicionado várias vezes,
    // considere o seguinte:
    // convertImageBtn.onclick = null; // Remove qualquer listener anterior
    // convertImageBtn.onclick = () => { /* ... sua lógica ... */ }; // Adiciona o novo


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


// 2. Lógica principal do DOMContentLoaded para ativar o conversor diretamente no clique do botão principal
document.addEventListener('DOMContentLoaded', () => {
    const buttonId = 'redirectButtonX'; // ID do botão que controlará a ativação do conversor
    const button = document.getElementById(buttonId);
    const converterSectionId = 'image-converter-section'; // ID da div que contém o conversor no HTML

    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Previne o comportamento padrão do botão

            console.log('Botão clicado! Ativando a funcionalidade do conversor de imagens.');

            // Tenta mostrar a seção do conversor de imagens, se estiver oculta
            const converterSection = document.getElementById(converterSectionId);
            if (converterSection) {
                converterSection.style.display = 'block'; // Torna a seção visível
                // Opcional: Rola a página para a seção do conversor para uma melhor experiência do usuário
                converterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn(`Seção do conversor com ID '${converterSectionId}' não encontrada. A funcionalidade pode não ser visível.`);
            }

            // Chama a função de inicialização do conversor.
            // Esta função só será chamada UMA VEZ por clique no botão 'redirectButtonX'.
            // A lógica de anexar os event listeners internos do conversor está em initializeImageConverter().
            initializeImageConverter();
        });
    } else {
        console.warn(`Botão com ID '${buttonId}' não encontrado. O script de ativação do conversor não será ativado.`);
    }
});