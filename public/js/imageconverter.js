document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imageFormatSelect = document.getElementById('imageFormat');
    const convertImageBtn = document.getElementById('convertImageBtn');
    const outputImage = document.getElementById('outputImage');
    const downloadLink = document.getElementById('downloadLink');

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
                        mimeType = 'image/png';
                }

                const imageDataUrl = canvas.toDataURL(mimeType);
                outputImage.src = imageDataUrl;
                outputImage.style.display = 'block';
                
                downloadLink.href = imageDataUrl;
                downloadLink.download = `converted_image.${format}`;
                downloadLink.textContent = `Baixar como ${format.toUpperCase()}`;
                downloadLink.style.display = 'inline-block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
});