// app.js
// Mantém lógica original e reposiciona corretamente os ícones "ai-sim" e "eita" ao lado do label no header dos cards

const API_PROXY = 'https://san-apps-teste.vercel.app';
const COSMOS_BASE = 'https://cdn-cosmos.bluesoft.com.br/products';

window.addEventListener('DOMContentLoaded', () => {
  // Lightbox de imagem
  (function() {
    const lb = document.createElement('div'); lb.id = 'lightbox';
    Object.assign(lb.style, {position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.8)',display:'none',alignItems:'center',justifyContent:'center',zIndex:10000,cursor:'zoom-out'});
    const img = document.createElement('img'); img.id = 'lightbox-img';
    Object.assign(img.style, {maxWidth:'90%',maxHeight:'90%',boxShadow:'0 0 8px #fff'});
    lb.appendChild(img);
    lb.addEventListener('click', () => lb.style.display = 'none');
    document.body.appendChild(lb);
  })();

  // Elementos DOM
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const daysRange        = document.getElementById('daysRange');
  const daysValue        = document.getElementById('daysValue');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');
  const historyListEl    = document.getElementById('history-list');
  const clearHistoryBtn  = document.getElementById('clear-history');

  daysValue.textContent = daysRange.value;
  daysRange.addEventListener('input', () => daysValue.textContent = daysRange.value);

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let historyArr = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let currentResults = [];
  let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;

  function saveHistory() { localStorage.setItem('searchHistory', JSON.stringify(historyArr)); }
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li = document.createElement('li'); li.className = 'history-item';
      const btn = document.createElement('button'); btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));
      if (item.image) {
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name; btn.appendChild(img);
      } else btn.textContent = item.name;
      li.appendChild(btn);
      historyListEl.appendChild(li);
    });
  }
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Deseja limpar o histórico de buscas?')) { historyArr = []; saveHistory(); renderHistory(); }
  });
  renderHistory();

  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedRadius = btn.dataset.value;
  }));

  function attachLightbox(imgEl) {
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', () => {
      const lb = document.getElementById('lightbox');
      lb.querySelector('img').src = imgEl.src;
      lb.style.display = 'flex';
    });
  }

  function renderSummary(list) {
    const first = list[0];
    const name = first.produto.descricaoSefaz || first.produto.descricao;
    const imgUrl = first.produto.gtin ? `${COSMOS_BASE}/${first.produto.gtin}` : '';
    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${imgUrl}" alt="${name}" />
          <div class="product-name-overlay">${name}</div>
        </div>
        <p class="summary-count"><strong>${list.length}</strong> estabelecimento(s) encontrado(s).</p>
      </div>`;
    const imgEl = summaryContainer.querySelector('img');
    if (imgEl) attachLightbox(imgEl);
  }

  function renderCards(list) {
    resultContainer.innerHTML = '';
    const sorted = [...list].sort((a, b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const est   = e.estabelecimento;
      const end   = est.endereco;
      const when  = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const price = brl.format(e.produto.venda.valorVenda);
      // Ícone correto extraído da pasta /public/images
            // Ícone correto extraído da pasta public/images
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
