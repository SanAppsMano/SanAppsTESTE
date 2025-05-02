// app.js
// Mantém lógica original, atualiza links “Ver no mapa” e “Como chegar” para usar latitude/longitude do objeto de endereço

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

  // DOM elements
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
  daysRange.addEventListener('input', () => { daysValue.textContent = daysRange.value; });

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
    if (confirm('Deseja limpar o histórico de buscas?')) {
      historyArr = []; saveHistory(); renderHistory();
    }
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
    const overlay = imgEl.parentElement.querySelector('.product-name-overlay');
    if (overlay) overlay.style.fontSize = '0.6rem';
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
      const color = i === 0 ? '#28a745' : '#dc3545';
      // Usa latitude/longitude do endereço conforme manual
      const lat = end.latitude;
      const lng = end.longitude;
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const dirLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-header ${i === 0 ? 'highlight-green' : 'highlight-red'}">
          ${i === 0 ? 'Menor preço' : 'Maior preço'} — ${est.nomeFantasia || est.razaoSocial}
        </div>
        <div class="card-body">
          <div class="info-group">
            <h4>Localização</h4>
            <p>${end.nomeLogradouro}, ${end.numeroImovel}</p>
            <p>${end.bairro} — ${est.municipio || end.municipio}</p>
            <p>CEP: ${end.cep}</p>
          </div>
          <div class="info-group">
            <h4>Contato</h4>
            <p>📞 ${est.telefone}</p>
          </div>
          <div class="info-group price-section">
            <h4>Preço</h4>
            <p><span class="price-value" style="color:${color}">${price}</span></p>
            <p class="price-date">Quando: ${when}</p>
          </div>
          <div class="action-buttons">
            <a href="${mapLink}" target="_blank" class="btn btn-map">📍 Ver no mapa</a>
            <a href="${dirLink}" target="_blank" class="btn btn-directions">🚗 Como chegar</a>
          </div>
        </div>`;
      resultContainer.appendChild(card);
    });
  }

  function loadFromCache(item) {
    const list = item.dados;
    barcodeInput.value = item.code;
    renderSummary(list);
    currentResults = list;
    renderCards(list);
  }

  async function searchByCode() {
    const code = barcodeInput.value.trim(); if (!code) return alert('Digite um código de barras.');
    loading.classList.add('active'); resultContainer.innerHTML = ''; summaryContainer.innerHTML = '';
    let lat, lng;
    if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
      try { const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej)); lat = pos.coords.latitude; lng = pos.coords.longitude; }
      catch { loading.classList.remove('active'); return alert('Não foi possível obter localização.'); }
    } else {
      [lat, lng] = document.getElementById('city').value.split(',').map(Number);
    }
    try {
      const diasEscolhidos = Number(daysRange.value);
      const resp = await fetch(`${API_PROXY}/api/search`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ codigoDeBarras: code, latitude: lat, longitude: lng, raio: Number(selectedRadius), dias: diasEscolhidos }) });
      const data = await resp.json(); loading.classList.remove('active');
      const list = Array.isArray(data.conteudo) ? data.conteudo : [];
      if (!list.length) { summaryContainer.innerHTML = `<p>Nenhum estabelecimento encontrado.</p>`; return; }
      historyArr.unshift({ code, name: data.dscProduto || list[0].produto.descricao, image: `${COSMOS_BASE}/${list[0].produto.gtin}`, dados: list }); saveHistory(); renderHistory(); renderSummary(list); currentResults = list; renderCards(list);
    } catch { loading.classList.remove('active'); alert('Erro na busca.'); }
  }

  btnSearch.addEventListener('click', searchByCode);

  // Modal lista ordenada (mesma lógica com links atualizados)
  document.getElementById('open-modal').addEventListener('click', () => {
    if (!currentResults.length) return alert('Faça uma busca primeiro.');
    const modal = document.getElementById('modal'), listEl = document.getElementById('modal-list'); listEl.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    sortedAll.forEach((e, i) => {
      const est   = e.estabelecimento;
      const end   = est.endereco;
      const when  = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const price = brl.format(e.produto.venda.valorVenda);
      const color = i === 0 ? '#28a745' : i === sortedAll.length - 1 ? '#dc3545' : '#007bff';
      const lat = end.latitude;
      const lng = end.longitude;
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const dirLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="card">
          <div class="card-header">${est.nomeFantasia || est.razaoSocial}</div>
          <div class="card-body">
            <div class="info-group">
              <h4>Localização</h4>
              <p>${end.nomeLogradouro}, ${end.numeroImovel}</p>
              <p>${end.bairro} — ${est.municipio || end.municipio}</p>
              <p>CEP: ${end.cep}</p>
            </div>
            <div class="info-group">
              <h4>Contato</h4>
              <p>📞 ${est.telefone}</p>
            </div>
            <div class="info-group price-section">
              <h4>Preço</h4>
              <p><span class="price-value" style="color:${color}">${price}</span></p>
              <p class="price-date">Quando: ${when}</p>
            </div>
            <div class="action-buttons">
              <a href="${mapLink}" target="_blank" class="btn btn-map">📍 Ver no mapa</a>
              <a href="${dirLink}" target="_blank" class="btn btn-directions">🚗 Como chegar</a>
            </div>
          </div>
        </div>`;
      listEl.appendChild(li);
    });
    document.getElementById('modal').classList.add('active');
  });
  document.getElementById('close-modal').addEventListener('click', () => document.getElementById('modal').classList.remove('active'));
  document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active'); });
});
