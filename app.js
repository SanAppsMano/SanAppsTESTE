/* app.js */
// front-end: chama o proxy interno em Vercel Functions
const API_PROXY = 'https://san-apps-teste.vercel.app';
// Base para imagens de produto
const COSMOS_BASE = 'https://cdn-cosmos.bluesoft.com.br/products';

window.addEventListener('DOMContentLoaded', () => {
  // — Elementos do DOM —
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');

  // Formatter moeda BRL
  const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let currentResults = [];

  // Histórico
  const historyListEl   = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history');
  let historyArr        = JSON.parse(localStorage.getItem('searchHistory') || '[]');

  function saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  }

  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const btn = document.createElement('button');
      btn.title = item.name;
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

  // Seleção de raio
  let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;
  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedRadius = btn.dataset.value;
  }));

  // Render de cards menor/maior
  function renderCards(itens) {
    resultContainer.innerHTML = '';
    // ordenar pelo preço de venda
    const sorted = [...itens].sort((a,b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const label = i === 0 ? 'Menor preço' : 'Maior preço';
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const when  = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const price = brlFormatter.format(e.produto.venda.valorVenda);
      const color = i === 0 ? '#28a745' : '#dc3545';
      const lat   = e.estabelecimento.endereco.latitude;
      const lng   = e.estabelecimento.endereco.longitude;
      const mapURL = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const dirURL = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const bairro   = e.estabelecimento.endereco.bairro || '—';
      const municipio = e.estabelecimento.endereco.municipio || '—';
      const desc     = e.produto.descricaoSefaz || e.produto.descricao;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.estabelecimento.nomeFantasia || e.estabelecimento.razaoSocial}</div>
        <div class="card-body">
          <div class="card-icon-right"><img src="${icon}" alt="${label}"></div>
          <p><strong>Preço:</strong> <span style="color:${color}">${price}</span></p>
          <p><strong>Bairro/Município:</strong> ${bairro} / ${municipio}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p><strong>Descrição:</strong> ${desc}</p>
          <p style="font-size:0.95rem;">
            <a href="${mapURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
            <a href="${dirURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
          </p>
        </div>
      `;
      resultContainer.appendChild(card);
    });
  }

  // Carrega do histórico
  function loadFromCache(item) {
    const dados = item.dados; barcodeInput.value = item.code;
    const primeiro = dados[0];
    const prodName = primeiro.produto.descricaoSefaz || primeiro.produto.descricao;
    const imgUrl   = primeiro.produto.gtin ?
                     `https://cdn-cosmos.bluesoft.com.br/products/${primeiro.produto.gtin}` :
                     'https://via.placeholder.com/150';
    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${imgUrl}" alt="${prodName}" />
          <div class="product-name-overlay">${prodName}</div>
        </div>
        <p><strong>${dados.length}</strong> estabelecimento(s) no histórico.</p>
      </div>
    `;
    currentResults = dados;
    renderCards(dados);
  }

  // Busca principal via Vercel Functions proxy
  btnSearch.addEventListener('click', async () => {
    const code = barcodeInput.value.trim(); if (!code) return alert('Digite um código de barras.');
    loading.classList.add('active'); resultContainer.innerHTML = ''; summaryContainer.innerHTML = '';
    let lat, lng; const loc = document.querySelector('input[name="loc"]:checked').value;
    if (loc === 'gps') {
      try { const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej)); lat = pos.coords.latitude; lng = pos.coords.longitude; }
      catch { loading.classList.remove('active'); return alert('Não foi possível obter localização.'); }
    } else {
      [lat, lng] = document.getElementById('city').value.split(',').map(Number);
    }
    try {
      const resp = await fetch(`${API_PROXY}/api/search`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ codigoDeBarras: code, latitude: lat, longitude: lng, raio: Number(selectedRadius), dias: 7 })
      });
      const data = await resp.json(); loading.classList.remove('active');
      const lista = Array.isArray(data.conteudo) ? data.conteudo : [];
      if (!lista.length) { summaryContainer.innerHTML = '<p>Nenhum estabelecimento encontrado.</p>'; return; }
      const primeiro = lista[0];
      const prodName = primeiro.produto.descricaoSefaz || primeiro.produto.descricao;
      const imgUrl   = primeiro.produto.gtin ?
                       `https://cdn-cosmos.bluesoft.com.br/products/${primeiro.produto.gtin}` :
                       'https://via.placeholder.com/150';
      summaryContainer.innerHTML = `
        <div class="product-header">
          <div class="product-image-wrapper">
            <img src="${imgUrl}" alt="${prodName}" />
            <div class="product-name-overlay">${prodName}</div>
          </div>
          <p><strong>${lista.length}</strong> estabelecimento(s) encontrado(s).</p>
        </div>
      `;
      historyArr.unshift({ code, name: prodName, image: imgUrl, dados: lista }); saveHistory(); renderHistory(); currentResults = lista; renderCards(lista);
    } catch (e) {
      loading.classList.remove('active'); alert('Erro na busca.');
    }
  });

  // Busca por descrição via Vercel Functions proxy
  const openDescBtn    = document.getElementById('open-desc-modal');
  const descModal      = document.getElementById('desc-modal');
  const closeDescBtn   = document.getElementById('close-desc-modal');
  const btnDescSearch  = document.getElementById('btn-desc-search');
  const descInput      = document.getElementById('desc-input');
  const descList       = document.getElementById('desc-list');
  openDescBtn.addEventListener('click', () => { descList.innerHTML = ''; descModal.classList.add('active'); });
  closeDescBtn.addEventListener('click', () => descModal.classList.remove('active'));
  btnDescSearch.addEventListener('click', async () => {
    const termo = descInput.value.trim(); if (!termo) return alert('Informe a descrição!');
    descList.innerHTML = ''; loading.classList.add('active');
    let lat, lng; const locType = document.querySelector('input[name="loc"]:checked').value;
    if (locType === 'gps') {
      try { const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej)); lat = pos.coords.latitude; lng = pos.coords.longitude; }
      catch { loading.classList.remove('active'); return alert('Não foi possível obter localização.'); }
    } else { [lat, lng] = document.getElementById('city').value.split(',').map(Number); }
    try {
      const resp = await fetch(`${API_PROXY}/api/searchDescricao`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ descricao: termo, latitude: lat, longitude: lng, raio: Number(selectedRadius), dias: 7 })
      });
      const json = await resp.json(); loading.classList.remove('active');
      const itens = Array.isArray(json.conteudo) ? json.conteudo : [];
      if (!itens.length) { return descList.innerHTML = '<li>Nenhum produto encontrado.</li>'; }
      itens.forEach(entry => {
        const li = document.createElement('li');
        const code = entry.produto.gtin;
        const name = entry.produto.descricaoSefaz || entry.produto.descricao;
        li.innerHTML = `<strong>${code}</strong> – ${name}`;
        li.addEventListener('click', () => {
          barcodeInput.value = code;
          descModal.classList.remove('active');
        });
        descList.appendChild(li);
      });
    } catch (e) {
      loading.classList.remove('active'); alert('Erro na busca por descrição: ' + e.message);
    }
  });

    // Modal para lista ordenada
  const openModalBtn  = document.getElementById('open-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modal         = document.getElementById('modal');
  const modalList     = document.getElementById('modal-list');

  openModalBtn.addEventListener('click', () => {
    if (!currentResults.length) return alert('Faça uma busca primeiro.');
    modalList.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    sortedAll.forEach((e, i) => {
      const price      = brlFormatter.format(e.produto.venda.valorVenda);
      const priceColor = i === 0
        ? '#28a745'           // menor - verde
        : i === sortedAll.length - 1
          ? '#dc3545'         // maior - vermelho
          : '#007bff';        // intermediário - azul
      const when        = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const bairro      = e.estabelecimento.endereco.bairro || '—';
      const municipio   = e.estabelecimento.endereco.municipio || '—';
      const desc        = e.produto.descricaoSefaz || e.produto.descricao;
      const lat         = e.estabelecimento.endereco.latitude;
      const lng         = e.estabelecimento.endereco.longitude;
      const mapURL      = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const dirURL      = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const li = document.createElement('li');
      li.innerHTML = `
        <div class="card">
          <div class="card-header">${e.estabelecimento.nomeFantasia || e.estabelecimento.razaoSocial}</div>
          <div class="card-body">
            <p><strong>Preço:</strong> <span style="color:${priceColor}">${price}</span></p>
            <p><strong>Bairro/Município:</strong> ${bairro} / ${municipio}</p>
            <p><strong>Quando:</strong> ${when}</p>
            <p><strong>Descrição:</strong> ${desc}</p>
            <p style="font-size:0.95rem;">
              <a href="${mapURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
              <a href="${dirURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
            </p>
          </div>
        </div>
      `;
      modalList.appendChild(li);
    });
    modal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));

  // Fecha modal ao clicar fora do conteúdo
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});
