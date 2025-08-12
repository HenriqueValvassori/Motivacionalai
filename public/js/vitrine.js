// Arquivo: js/vitrine.js

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();

    const filtroSelect = document.getElementById('filtro');
    filtroSelect.addEventListener('change', (e) => {
        const classificacao = e.target.value;
        carregarProdutos(classificacao);
    });
});

async function carregarProdutos(classificacao = 'todos') {
    try {
        let url = '/.netlify/functions/produto';
        if (classificacao !== 'todos') {
            url += `?classificacao=${classificacao}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro na requisição da API');
        }
        const produtos = await response.json();
        renderizarProdutos(produtos);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Não foi possível carregar os produtos.');
    }
}

function renderizarProdutos(produtos) {
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = ''; // Limpa a vitrine antes de renderizar

    if (produtos.length === 0) {
        vitrine.innerHTML = '<p>Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    produtos.forEach(produto => {
        const card = document.createElement('div');
        card.classList.add('card-produto');
        card.innerHTML = `
            <<iframe src="${produto.imagemUrl}" title="${produto.nome}"></iframe>
            <h3>${produto.nome}</h3>
            <p class="preco">R$ ${produto.preco}</p>
            <span class="tag-classificacao">${produto.classificacao}</span>
            <a href="${produto.link}" target="_blank" class="btn-link">Ir para o link</a>
        `;
        vitrine.appendChild(card);
    });
}