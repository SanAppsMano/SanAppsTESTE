// app.js - final corrected version

// Função para fetch com timeout
function fetchWithTimeout(resource, options = {}, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

window.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const errorMessageDiv  = document.getElementById('error-message');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');
  const historyListEl    = document.getElementById('history-list');
  const clearHistoryBtn  = document.getElementById('clear-history');
  const openModalBtn     = document.getElementById('open-modal');
  const closeModalBtn    = document.getElementById('close-modal');
  const modal            = document.getElementById('modal');
  const modalList        = document.getElementById('modal-list');

  let historyArr       = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let selectedRadius   = document.querySelector('.radius-btn.active').dataset.value;
  let currentResults   = [];

  // Salva e renderiza histórico
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
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name;
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
      saveHistory(); renderHistory();
    }
  });
  renderHistory();

  // Seleção de raio
  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  }));

  // Limpa interface para nova busca
  function clearResults() {
    resultContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    errorMessageDiv.textContent = '';
    currentResults = [];
  }

  // Renderiza cards de resultado
  function renderCards(dados) {
    if (!Array.isArray(dados) || dados.length === 0) return;
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const label = i === 0 ? 'Menor preço' : 'Maior preço';
      const when  = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const mapL  = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL  = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          <div class="card-icon-right"><img src="${icon}" alt=""></div>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank">Ver no mapa</a> | <a href="${dirL}" target="_blank">Como chegar</a></p>
        </div>
      `;
      resultContainer.appendChild(card);
    });
  }

  // Carrega item do cache
  function loadFromCache(item) {
    if (!item.dados || !Array.isArray(item.dados) || item.dados.length === 0) {
      errorMessageDiv.textContent = 'Sem dados em cache para este produto.';
      return;
    }
    barcodeInput.value = item.code;
    summaryContainer.innerHTML = `<p><strong>${item.dados.length}</strong> estabelecimento(s) no histórico.</p>`;
    clearResults();
    renderCards(item.dados);
  }

  // Evento de busca
  btnSearch.addEventListener('click', async e => {
    e.preventDefault();
    const barcode = barcodeInput.value.trim();
    if (!barcode) {
      errorMessageDiv.textContent = 'Digite um código de barras válido.';
      return;
    }
    clearResults();
    loading.classList.add('active');
    btnSearch.textContent = 'Iniciando busca...';
    
    // Obter localização
    const locType = document.querySelector('input[name="loc"]:checked').value;
    let latitude, longitude;
    if (locType === 'gps') {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        ({ latitude, longitude } = pos.coords);
      } catch {
        loading.classList.remove('active'); btnSearch.textContent = 'Pesquisar';
        errorMessageDiv.textContent = 'Não foi possível obter sua localização.';
        return;
      }
    } else {
      [latitude, longitude] = document.getElementById('city').value.split(',').map(Number);
    }

    // Chamada à função em background
    try {
      const res = await fetchWithTimeout(
        '/.netlify/functions/search-background',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigoDeBarras: barcode, latitude, longitude, raio: Number(selectedRadius), dias: 3 })
        },
        60000
      );
      const json = await res.json();
      loading.classList.remove('active'); btnSearch.textContent = 'Pesquisar';
      if (res.status === 202) {
        errorMessageDiv.textContent = json.message || 'Busca iniciada em background.';
      } else if (res.status === 404) {
        errorMessageDiv.textContent = json.error || 'Nenhum estabelecimento encontrado para esse código.';
      } else {
        errorMessageDiv.textContent = json.error || 'Erro ao iniciar busca.';
      }
    } catch (err) {
      loading.classList.remove('active'); btnSearch.textContent = 'Pesquisar';
      if (err.name === 'AbortError') {
        errorMessageDiv.textContent = 'Tempo de resposta excedido. Tente novamente mais tarde.';
      } else {
        errorMessageDiv.textContent = 'Sem resposta do servidor. Tente mais tarde.';
      }
    }
  });

  // Modal lista ordenada
  openModalBtn.addEventListener('click', () => {
    if (!currentResults.length) {
      errorMessageDiv.textContent = 'Faça uma busca antes de ver a lista.';
      return;
    }
    modalList.innerHTML = '';
    currentResults.sort((a, b) => a.valMinimoVendido - b.valMinimoVendido)
      .forEach((e, idx) => {
        const when = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
        const icon = idx === 0 ? 'public/images/ai-sim.png' : (idx === currentResults.length - 1 ? 'public/images/eita.png' : '');
        const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
        const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
        const li = document.createElement('li');
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `
          <div class="card-header">${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
          <div class="card-body">
            <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
            ${icon ? `<div class="card-icon-right"><img src="${icon}"></div>` : ''}
            <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${
