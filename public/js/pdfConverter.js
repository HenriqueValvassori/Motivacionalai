// pdfConverter.js
import { getDocument } from './lib/pdfjs/build/pdf.mjs'; // Caminho confirmado

// ******** ADICIONE ESTA LINHA AQUI! ********
// Define o caminho para o Web Worker. ISSO É CRUCIAL!
// pdfjsLib é exposto globalmente quando pdf.mjs é carregado.
// Ajuste o caminho './lib/pdfjs/build/pdf.worker.mjs' se for diferente no seu projeto.
pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdfjs/build/pdf.worker.mjs';
// ********************************************

document.addEventListener('DOMContentLoaded', () => {
    const pdfInput = document.getElementById('pdfInput');
    const viewPdfBtn = document.getElementById('viewPdfBtn');
    const pdfViewer = document.getElementById('pdfViewer');
    const extractedImage = document.getElementById('extractedImage');
    const downloadPdfImageLink = document.getElementById('downloadPdfImageLink');

    viewPdfBtn.addEventListener('click', async () => {
        const file = pdfInput.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo PDF.');
            return;
        }

        pdfViewer.innerHTML = '<p>Carregando PDF...</p>';
        extractedImage.style.display = 'none';
        downloadPdfImageLink.style.display = 'none';

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);

            try {
                const pdf = await getDocument({ data: typedarray }).promise;
                pdfViewer.innerHTML = ''; // Limpa a mensagem de carregamento

                // ... (restante do seu código) ...

            } catch (error) {
                console.error('Erro ao processar PDF:', error);
                pdfViewer.innerHTML = `<p style="color: red;">Erro ao carregar ou processar PDF: ${error.message}</p>`;
            }
        };
        fileReader.readAsArrayBuffer(file);
    });
});