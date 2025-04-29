/* app.js */
// front-end: proxy interno Vercel Functions
const API_PROXY = 'https://san-apps-teste.vercel.app';
const COSMOS_BASE = 'https://cdn-cosmos.bluesoft.com.br/products';

window.addEventListener('DOMContentLoaded', () => {
  // Cria lightbox
  (function() {
    const lb = document.createElement('div');
    lb.id = 'lightbox';
    Object.assign(lb.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: 10000, cursor: 'zoom-out'
    });
    const img = document.createElement('img');
    img.id = 'lightbox-img';
    Object.assign(img.style, { maxWidth: '90%', maxHeight: '90%', boxShadow: '0 0 8px #fff' });
    lb.appendChild(img);
    lb.addEventListener('click', () => lb.style.display = 'none');
    document.body.appendChild(lb);
  })();

  // DOM
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

  // Atualiza label de dias ao mover o slider
  daysValue.textContent = daysRange.value;
  daysRange.addEventListener('input', () => {
    daysValue.textContent = daysRange.value;
  });

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let historyArr = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let currentResults = [];
  let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;

  function saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  }
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li = document.createElement('li'); li.className = 'history-item';
      const btn = document.createElement('button'); btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));
      if (item.image) {
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name; btn.appendChild(img);
      } else btn.textContent = item.name;
      li.appendChild(btn); historyListEl.appendChild(li);
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
        <p><strong>${list.length}</strong> estabelecimento(s) encontrado(s).</p>
      </div>`;
    const imgEl = summaryContainer.querySelector('img');
    if (imgEl) attachLightbox(imgEl);
  }

  function renderCards(list) {
    resultContainer.innerHTML = '';
    const sorted = [...list].sort((a, b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const label = i === 0 ? 'Menor preço' : 'Maior preço';
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const when  = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const price = brl.format(e.produto.venda.valorVenda);
      const color = i === 0 ? '#28a745' : '#dc3545';
      const end   = e.estabelecimento.endereco;
      const desc  = e.produto.descricaoSefaz || e.produto.descricao;
      const mapURL = `https://www.google.com/maps/search/?api=1&query=${end.latitude},${end.longitude}`;
      const dirURL = `https://www.google.com/maps/dir/?api=1&destination=${end.latitude},${end.longitude}`;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.estabelecimento.nomeFantasia || e.estabelecimento.razaoSocial}</div>
        <div class="card-body">
          <div class="card-icon-right"><img src="${icon}" alt="${label}"></div>
          <p><strong>Preço:</strong> <span style="color:${color}">${price}</span></p>
          <p><strong>Bairro/Município:</strong> ${end.bairro || '—'} / ${end.municipio || '—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p><strong>Descrição:</strong> ${desc}</p>
          <p style="font-size:0.95rem;">
            <a href="${mapURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
            <a href="${dirURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
          </p>
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
    const code = barcodeInput.value.trim();
    if (!code) return alert('Digite um código de barras.');
    loading.classList.add('active');
    resultContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    let lat, lng;
    if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch {
        loading.classList.remove('active');
        return alert('Não foi possível obter localização.');
      }
    } else {
      [lat, lng] = document.getElementById('city').value.split(',').map(Number);
    }
    try {
      const diasEscolhidos = Number(daysRange.value);
      const resp = await fetch(`${API_PROXY}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoDeBarras: code, latitude: lat, longitude: lng, raio: Number(selectedRadius), dias: diasEscolhidos })
      });
      const data = await resp.json();
      loading.classList.remove('active');
      const list = Array.isArray(data.conteudo) ? data.conteudo : [];
      if (!list.length) {
        summaryContainer.innerHTML = `<p>Nenhum estabelecimento encontrado.</p>`;
        return;
      }
      historyArr.unshift({ code, name: data.dscProduto || list[0].produto.descricao, image: `${COSMOS_BASE}/${list[0].produto.gtin}`, dados: list });
      saveHistory();
      renderHistory();
      renderSummary(list);
      currentResults = list;
      renderCards(list);
    } catch (e) {
      loading.classList.remove('active');
      alert('Erro na busca.');
    }
  }

  btnSearch.addEventListener('click', searchByCode);

  // Modal lista ordenada
  document.getElementById('open-modal').addEventListener('click', () => {
    if (!currentResults.length) return alert('Faça uma busca primeiro.');
    const modal = document.getElementById('modal'), listEl = document.getElementById('modal-list');
    listEl.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.produto.venda.valorVenda - b.produto.venda.valorVenda);
    sortedAll.forEach((e, i) => {
      const price = brl.format(e.produto.venda.valorVenda);
      const color = i === 0 ? '#28a745' : i === sortedAll.length - 1 ? '#dc3545' : '#007bff';
      const when = e.produto.venda.dataVenda ? new Date(e.produto.venda.dataVenda).toLocaleString() : '—';
      const end = e.estabelecimento.endereco;
      const desc = e.produto.descricaoSefaz || e.produto.descricao;
      const mapURL = `https://www.google.com/maps/search/?api=1&query=${end.latitude},${end.longitude}`;
      const dirURL = `https://www.google.com/maps/dir/?api=1&destination=${end.latitude},${end.longitude}`;
      const li = document.createElement('li');
      li.innerHTML = `<div class="card"><div class="card-header">${e.estabelecimento.nomeFantasia || e.estabelecimento.razaoSocial}</div><div class="card-body"><p><strong>Preço:</strong> <span style="color:${color}">${price}</span></p><p><strong>Bairro/Município:</strong> ${end.bairro || '—'} / ${end.municipio || '—'}</p><p><strong>Quando:</strong> ${when}</p><p><strong>Descrição:</strong> ${desc}</p><p style="font-size:0.95rem;"><a href="${mapURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> | <a href="${dirURL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a></p></div></div>`;
      listEl.appendChild(li);
    });
    document.getElementById('modal').classList.add('active');
  });
  document.getElementById('close-modal').addEventListener('click', () => document.getElementById('modal').classList.remove('active'));
  document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active'); });
});
