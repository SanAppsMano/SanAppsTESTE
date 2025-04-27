/* app.js */
// API_BASE é injetado no HTML (index.html)

window.addEventListener('DOMContentLoaded', () => {
  // — Referências ao DOM —
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');

  // Formatter para moeda BRL
  const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  let currentResults = []; // resultados para lista ordenada

  // — Histórico —
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

  function renderCards(dados) {
    // ... código inalterado para renderCards
  }

  function loadFromCache(item) {
    // ... código inalterado para loadFromCache
  }

  // Busca principal - inalterado

  // Lista Ordenada (Modal)
  const openModalBtn  = document.getElementById('open-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modal         = document.getElementById('modal');
  const modalList     = document.getElementById('modal-list');

  openModalBtn.addEventListener('click', () => {
    if (!currentResults.length) return alert('Não há resultados para exibir.');
    modalList.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    sortedAll.forEach((e, i) => {
      const when      = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const mapURL    = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirURL    = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const price     = brlFormatter.format(e.valMinimoVendido);
      const priceColor = i === 0 ? '#28a745' : (i === sortedAll.length - 1 ? '#dc3545' : '#007bff');
      const li        = document.createElement('li');
      li.innerHTML    = `
        <div class="card">
          <div class="card-header">${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
          <div class="card-body">
            <p><strong>Preço:</strong> <span style="color:${priceColor}">${price}</span></p>
            <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
            <p><strong>Quando:</strong> ${when}</p>
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

  // Busca Descrição Modal - inalterado

});
