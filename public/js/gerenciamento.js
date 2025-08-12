// Arquivo: js/gerenciamento.js

const cadastrarBtn = document.getElementById('cadastrarBtn');
const editarBtn = document.getElementById('editarBtn');
const excluirBtn = document.getElementById('excluirBtn');

// Adicione um ID para armazenar o produto a ser editado
let produtoEmEdicaoId = null;

// --- Função para Cadastrar Produto ---
// Arquivo: js/gerenciamento.js

// ... (código existente) ...

cadastrarBtn.addEventListener('click', async () => {
    const imagemInput = document.getElementById('imagem'); // Use um input de tipo 'file'
    const imagemFile = imagemInput.files[0];

    if (!imagemFile) {
        alert('Por favor, selecione uma imagem.');
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(imagemFile);

    reader.onload = async () => {
        const base64Image = reader.result.split(',')[1]; // Pega a parte da string em Base64

        const produto = {
            nome: document.getElementById('nome').value,
            classificacao: document.getElementById('classificacao').value,
            link: document.getElementById('link').value,
            preco: document.getElementById('preco').value,
            base64Image: base64Image
        };

        try {
            const response = await fetch('/.netlify/functions/produto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto),
            });
            const data = await response.json();
            console.log('Produto cadastrado:', data);
            alert('Produto cadastrado com sucesso!');
            limparFormulario();
            recarregarVitrine();
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            alert('Erro ao cadastrar produto.');
        }
    };
});
// --- Função para Excluir Produto (exemplo) ---
excluirBtn.addEventListener('click', async () => {
    if (produtoEmEdicaoId) {
        try {
            const response = await fetch(`/.netlify/functions/produto/${produtoEmEdicaoId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                console.log('Produto excluído:', produtoEmEdicaoId);
                alert('Produto excluído com sucesso!');
                limparFormulario();
            } else {
                throw new Error('Falha ao excluir produto.');
            }
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            alert('Erro ao excluir produto.');
        }
    }
});

// --- Função para Editar Produto (exemplo) ---
editarBtn.addEventListener('click', async () => {
    if (produtoEmEdicaoId) {
        const produtoAtualizado = {
            nome: document.getElementById('nome').value,
            classificacao: document.getElementById('classificacao').value,
            link: document.getElementById('link').value,
            preco: document.getElementById('preco').value,
           imagemUrl: document.getElementById('imagemUrl').value // Este valor deve ser o link direto do ImgBB
};
        try {
            const response = await fetch(`/.netlify/functions/produto/${produtoEmEdicaoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoAtualizado),
            });
            const data = await response.json();
            console.log('Produto editado:', data);
            alert('Produto editado com sucesso!');
            limparFormulario();
        } catch (error) {
            console.error('Erro ao editar produto:', error);
            alert('Erro ao editar produto.');
        }
    }
});

function limparFormulario() {
    document.getElementById('nome').value = '';
    document.getElementById('classificacao').value = 'eletronicos';
    document.getElementById('link').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('imagemUrl').value = ''; // Limpa o novo campo
    
    cadastrarBtn.style.display = 'block';
    editarBtn.style.display = 'none';
    excluirBtn.style.display = 'none';
    produtoEmEdicaoId = null;
}