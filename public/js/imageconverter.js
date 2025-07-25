// js/imageConverter.js
document.addEventListener('DOMContentLoaded', () => {
    const buttonId = 'redirectButtonX'; // ID do seu botão
    const button = document.getElementById(buttonId);

    if (button) {
        const hasRedirectedKey = 'hasRedirectedForButtonX'; // Chave para localStorage
        const firstRedirectPage = 'https://descendedlibrarian.com/msqwx58fq?key=7d770b55d06de394db5b4dd6f9085d98'; // A página para redirecionar APENAS UMA VEZ

        // --- IMPORTANTE: Definir uma função a ser chamada quando for a "segunda vez" ---
        // Se a lógica do imageConverter.js já é executada automaticamente ao ser carregado,
        // ou se você quer chamar uma função específica dentro dele.
        // Opção 1: Supondo que imageConverter.js tem uma função global 'initImageConverter'
        const defaultActionFunction = () => {
            console.log('Executando a lógica do imageConverter.js...');
            // Exemplo: se imageConverter.js tem uma função para inicializar o conversor
            if (typeof initializeImageConverter === 'function') {
                initImageConverter(); // Chame a função de inicialização
            } else {
                console.warn('Função initImageConverter não encontrada. Verifique se imageConverter.js a expõe globalmente.');
            }
            // Você pode adicionar qualquer outra lógica aqui que seria o comportamento "normal"
            // Por exemplo, mostrar/esconder elementos na página.
        };

        // Opção 2 (menos comum para scripts que inicializam coisas):
        // Se a ideia é simplesmente 'garantir que o script imageConverter.js seja carregado',
        
        // no HTML da página principal. O comportamento do 'else' abaixo seria
        // apenas para notificação, pois o script já estaria rodando.


        button.addEventListener('click', (event) => {
            event.preventDefault(); // Previne o comportamento padrão do botão

            const hasRedirected = localStorage.getItem(hasRedirectedKey);

            if (!hasRedirected) {
                // Primeira vez: redireciona para a página X
                localStorage.setItem(hasRedirectedKey, 'true'); // Marca que já redirecionou
                window.location.href = firstRedirectPage;
            } else {
                // Próximas vezes: Executa a ação padrão (neste caso, chamar a função)
                console.log('Comportamento padrão: executando a ação secundária.');
                defaultActionFunction(); // Chama a função definida acima
                // Ou, se a ideia é só "avançar" na página para a seção do conversor,
                // você pode rolar a página ou mostrar um elemento.
                // Ex: window.location.hash = 'image-converter-section';
                // Ou: document.getElementById('image-converter-section').style.display = 'block';
            }
        });
    } else {
        console.warn(`Botão com ID '${buttonId}' não encontrado. O script de redirecionamento não será ativado.`);
    }

// Envolve toda a lógica de inicialização em uma função nomeada e globalmente acessível
function initializeImageConverter() {
    console.log('Image Converter: Inicializando funcionalidade...');

    const imageInput = document.getElementById('imageInput');
    const imageFormatSelect = document.getElementById('imageFormat');
    const convertImageBtn = document.getElementById('convertImageBtn');
    const outputImage = document.getElementById('outputImage');
    const downloadLink = document.getElementById('downloadLink');

    // **IMPORTANTE:** Verificar se os elementos existem antes de adicionar listeners.
    // Isso é crucial se a seção do conversor estiver inicialmente oculta (display: none)
    // e for mostrada apenas na segunda interação. Se os elementos não existirem no DOM
    // no momento do DCL, os getElementById retornarão null.
    if (!imageInput || !imageFormatSelect || !convertImageBtn || !outputImage || !downloadLink) {
        console.warn('Image Converter: Nem todos os elementos HTML necessários foram encontrados no DOM. ' +
                     'A funcionalidade pode não ser ativada corretamente. ' +
                     'Certifique-se de que a seção do conversor está visível ou existe no DOM quando esta função é chamada.');
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
});
// Opcional: Chame a função automaticamente se você quiser que o conversor
// seja inicializado no carregamento normal da página (sem o botão de redirecionamento).
// Mas para o seu caso de uso com redirectOnce.js, você NÃO deve chamar aqui.
// Em vez disso, a chamada será feita pelo redirectOnce.js.

// document.addEventListener('DOMContentLoaded', initializeImageConverter); // REMOVA ou COMENTE esta linha se você vai chamar via redirectOnce.js