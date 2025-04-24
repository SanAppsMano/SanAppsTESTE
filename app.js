/* app.js */

// Garante que todo o DOM esteja carregado antes de associar eventos
window.addEventListener('DOMContentLoaded', () => {
  // — Referências ao DOM —
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');

  // — Histórico —
  const historyListEl   = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history');
  let historyArr        = JSON.parse(localStorage.getItem('searchHistory') || '[]');

  // Persiste histórico em localStorage
  function saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  }

  // Variável para cache de resultados atuais
  let currentResults = [];

  // — Renderiza histórico —
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li  = document.createElement('li');
      li.className = 'history-item';
      const btn = document.createElement('button');
      btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));

      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        btn.appendChild(img);
      } else {
        btn.textContent = item.name;
      }
      li.appendChild(btn);
      historyListEl.appendChild(li);
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Deseja limpar o histórico de buscas?')) {
      historyArr = [];
      saveHistory();
      renderHistory();
    }
  });

  renderHistory();

  // — Seleção de raio de busca —
  let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;
  radiusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      radiusButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRadius = btn.dataset.value;
    });
  });

  // — Função para renderizar cards (menor e maior preço) —
  function renderCards(dados) {
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];

    [menor, maior].forEach((e, i) => {
      const priceLab = i === 0 ? 'Menor preço' : 'Maior preço';
      // Usa caminho correto para imagens no Git
      const iconSrc  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const altText  = i === 0 ? 'Ai sim' : 'Eita';
      const mapL     = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL     = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const when     = e.dthEmissaoUltimaVenda
        ? new Date(e.dthEmissaoUltimaVenda).toLocaleString()
        : '—';

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${priceLab} — ${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          <div class="card-icon-right"><img src="${iconSrc}" alt="${altText}"></div>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p style="font-size:0.95rem;">
            <a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
            <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
          </p>
        </div>
      `;
      resultContainer.appendChild(card);
    });
  }

  // — Renderiza o resumo + cards a partir do cache —
  function loadFromCache(item) {
    if (!item.dados || !Array.isArray(item.dados)) {
      alert('Sem dados em cache para este produto. Faça a busca primeiro.');
      return;
    }
    currentResults = item.dados;
    barcodeInput.value = item.code;
    const { name: productName, image: productImg, dados } = item;

    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${productImg || 'https://via.placeholder.com/150'}" alt="${productName}" />
          <div class="product-name-overlay">${productName}</div>
        </div>
        <p><strong>${dados.length}</strong> estabelecimento(s) no histórico.</p>
      </div>
    `;
    renderCards(dados);
  }

  // — Função principal de busca —
  btnSearch.addEventListener('click', async () => {
    const barcode = barcodeInput.value.trim();
    if (!barcode) {
      alert('Digite um código de barras válido.');
      return;
    }
    btnSearch.textContent = 'Atualizar Preço';
    btnSearch.classList.add('btn-update-font');

    loading.classList.add('active');
    resultContainer.innerHTML  = '';
    summaryContainer.innerHTML = '';

    const locType = document.querySelector('input[name="loc"]:checked').value;
    let latitude, longitude;
    if (locType === 'gps') {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        latitude  = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        loading.classList.remove('active');
        alert('Não foi possível obter sua localização.');
        return;
      }
    } else {
      [latitude, longitude] = document.getElementById('city').value.split(',').map(Number);
    }

    let data;
    try {
      const res = await fetch('/.netlify/functions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoDeBarras: barcode, latitude: Number(latitude), longitude: Number(longitude), raio: Number(selectedRadius), dias: 3 })
      });
      data = await res.json();
    } catch {
      loading.classList.remove('active');
      alert('Erro ao buscar preços. Tente novamente mais tarde.');
      return;
    }

    loading.classList.remove('active');
    btnSearch.textContent = 'Pesquisar';
    btnSearch.classList.remove('btn-update-font');

    const dados = Array.isArray(data) ? data : (Array.isArray(data.dados) ? data.dados : []);
    if (!dados.length) {
      resultContainer.innerHTML = `<p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>`;
      return;
    }

    currentResults = dados;
    const primeiro    = dados[0];
    const productName = data.dscProduto || primeiro.dscProduto || 'Produto não identificado';
    const productImg  = primeiro.codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${primeiro.codGetin}` : '';

    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${productImg || 'https://via.placeholder.com/150'}" alt="${productName}" />
        </div>
        <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
      </div>
    `;
    historyArr.unshift({ code: barcode, name: productName, image: productImg, dados });
    saveHistory();
    renderHistory();
    renderCards(dados);
  });

  // — Funcionalidade do Modal de Lista Ordenada —
  const openModalBtn  = document.getElementById('open-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modal         = document.getElementById('modal');
  const modalList     = document.getElementById('modal-list');

  openModalBtn.addEventListener('click', () => {
    if (!currentResults.length) { alert('Não há resultados para exibir. Faça uma busca primeiro.'); return; }
    modalList.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    sortedAll.forEach((e, idx) => {
      const li    = document.createElement('li');
      const card  = document.createElement('div'); card.className = 'card';
      const mapL  = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL  = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const when  = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const iconSrcModal = (idx === 0) ? 'public/images/ai-sim.png' : (idx === sortedAll.length - 1 ? 'public/images/eita.png' : '');
      card.innerHTML = `
        <div class="card-header">${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          ${iconSrcModal ? `<div class="card-icon-right"><img src="${iconSrcModal}" alt=""></div>` : ''}
          <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> | <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a></p>
        </div>
      `;
      li.appendChild(card);
      modalList.appendChild(li);
    });
    modal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
});
