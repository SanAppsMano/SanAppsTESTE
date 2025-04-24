/* app.js */

// Configuração da URL da API no Google Apps Script
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxf9YoD14eydIBvMe-wPIDRt0_LGzwyEwoKmCch2HiHbJxPBRkS38B-fAIs8xulew-P/exec';

// Garante que todo o DOM esteja carregado antes de associar eventos
window.addEventListener('DOMContentLoaded', () => {
  // — Referências ao DOM —
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');
  const historyListEl    = document.getElementById('history-list');
  const clearHistoryBtn  = document.getElementById('clear-history');

  // Evita submit de form
  btnSearch.type = 'button';

  let historyArr = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let currentResults = [];
  let selectedRadius = document.querySelector('.radius-btn.active')?.dataset.value || '15';

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

  radiusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      radiusButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRadius = btn.dataset.value;
    });
  });

  function renderCards(dados) {
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const label = i === 0 ? 'Menor preço' : 'Maior preço';
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const when  = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const mapL  = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL  = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          <div class="card-icon-right"><img src="${icon}" alt=""></div>
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

  function loadFromCache(item) {
    if (!item.dados?.length) {
      alert('Sem dados em cache para este produto. Faça a busca primeiro.');
      return;
    }
    currentResults = item.dados;
    barcodeInput.value = item.code;
    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${item.image || 'https://via.placeholder.com/150'}" alt="${item.name}" />
          <div class="product-name-overlay">${item.name}</div>
        </div>
        <p><strong>${item.dados.length}</strong> estabelecimento(s) no histórico.</p>
      </div>
    `;
    renderCards(item.dados);
  }

  btnSearch.addEventListener('click', async e => {
    e.preventDefault();
    const code = barcodeInput.value.trim();
    if (!code) return alert('Digite um código de barras válido.');
    btnSearch.textContent = 'Atualizar Preço';
    loading.classList.add('active');
    resultContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    let latitude, longitude;
    const locType = document.querySelector('input[name="loc"]:checked').value;
    if (locType === 'gps') {
      try {
        const pos = await new Promise((r, j) => navigator.geolocation.getCurrentPosition(r, j));
        ({ latitude, longitude } = pos.coords);
      } catch {
        loading.classList.remove('active');
        return alert('Não foi possível obter sua localização.');
      }
    } else {
      [latitude, longitude] = document.getElementById('city').value.split(',').map(Number);
    }

    const raioNum = Number(selectedRadius) || 15;
    try {
      const url = new URL(API_ENDPOINT);
      url.searchParams.set('codigoDeBarras', code);
      url.searchParams.set('latitude', latitude);
      url.searchParams.set('longitude', longitude);
      url.searchParams.set('raio', raioNum);
      url.searchParams.set('dias', 3);
      const res = await fetch(url);
      const data = await res.json();
      if (!data?.length && !data?.dados?.length) {
        resultContainer.innerHTML = `<p>Nenhum estabelecimento encontrado em até <strong>${raioNum} km</strong>.</p>`;
      } else {
        const dados = data.dados || data;
        summaryContainer.innerHTML = `<p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>`;
        historyArr.unshift({ code, name: data.dscProduto || dados[0].dscProduto, image: dados[0].codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${dados[0].codGetin}` : '', dados });
        saveHistory(); renderHistory(); renderCards(dados);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar preços. Tente novamente mais tarde.');
    } finally {
      loading.classList.remove('active');
      btnSearch.textContent = 'Pesquisar';
    }
  });

  const openModalBtn  = document.getElementById('open-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modal         = document.getElementById('modal');
  const modalList     = document.getElementById('modal-list');

  openModalBtn.addEventListener('click', () => {
    if (!currentResults.length) return alert('Não há resultados para exibir.');
    modalList.innerHTML = '';
    currentResults.sort((a,b)=>a.valMinimoVendido-b.valMinimoVendido).forEach((e,idx) => {
      const when = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const icon = idx===0?'public/images/ai-sim.png':(idx===currentResults.length-1?'public/images/eita.png':'');
      const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      modalList.innerHTML += `
        <li><div class="card">
          <div class="card-header">${e.nomFantasia||e.nomRazaoSocial||'—'}</div>
          <div class="card-body">
            <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
            ${icon?`<div class="card-icon-right"><img src="${icon}"></div>`:''}
            <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
            <p><strong>Quando:</strong> ${when}</p>
            <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank">Ver no mapa</a> | <a href="${dirL}" target="_blank">Como chegar</a></p>
          </div>
        </div></li>`;
    });
    modal.classList.add('active');
  });

  closeModalBtn.addEventListener('click',()=>modal.classList.remove('active'));
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('active');});
});
