/* app.js - Versão JSONP */

// URL do Apps Script JSONP (sem parâmetros)
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxf9YoD14eydIBvMe-wPIDRt0_LGzwyEwoKmCch2HiHbJxPBRkS38B-fAIs8xulew-P/exec';

// Callback global chamada pelo JSONP
function handlePrices(resp) {
  const loading = document.getElementById('loading');
  const btnSearch = document.getElementById('btn-search');

  loading.classList.remove('active');
  btnSearch.textContent = 'Pesquisar';

  // Verifica erro
  if (!resp || resp.error) {
    alert(resp && resp.error ? resp.error : 'Erro ao buscar preços.');
    return;
  }

  const dados = Array.isArray(resp.dados) ? resp.dados : resp;
  const productName = resp.dscProduto || (dados[0] && dados[0].dscProduto) || 'Produto';

  // Atualiza o summary
  const summary = document.getElementById('summary');
  summary.innerHTML = `
    <div class="product-header">
      <div class="product-image-wrapper">
        <img src="${dados[0].codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${dados[0].codGetin}` : 'https://via.placeholder.com/150'}" alt="${productName}" />
      </div>
      <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    </div>`;

  // Salva e renderiza histórico
  const historyArr = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  const code = document.getElementById('barcode').value.trim();
  historyArr.unshift({ code, name: productName, image: dados[0].codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${dados[0].codGetin}` : '', dados });
  localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  renderHistory(historyArr);

  // Renderiza cards
  renderCards(dados);
}

// Função para disparar JSONP
function buscarJSONP(code, latitude, longitude, raio = 15, dias = 3) {
  const url = new URL(API_ENDPOINT);
  url.searchParams.set('codigoDeBarras', code);
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('raio', raio);
  url.searchParams.set('dias', dias);
  url.searchParams.set('callback', 'handlePrices');

  // Injeta script JSONP
  const script = document.createElement('script');
  script.src = url.toString();
  document.body.appendChild(script);
}

window.addEventListener('DOMContentLoaded', () => {
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');
  const historyListEl    = document.getElementById('history-list');
  const clearHistoryBtn  = document.getElementById('clear-history');

  let selectedRadius = document.querySelector('.radius-btn.active')?.dataset.value || '15';

  // Tipo de botão para evitar submit
  btnSearch.type = 'button';

  // Renderiza histórico existente
  function renderHistory(arr) {
    historyListEl.innerHTML = '';
    arr.forEach(item => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));
      if (item.image) {
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name;
        btn.appendChild(img);
      } else {
        btn.textContent = item.name;
      }
      li.className = 'history-item';
      li.appendChild(btn);
      historyListEl.appendChild(li);
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Deseja limpar o histórico de buscas?')) {
      localStorage.removeItem('searchHistory');
      renderHistory([]);
    }
  });

  // Seleção de raio
  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  }));

  // Renderizar cards (menor e maior)
  function renderCards(dados) {
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a,b)=>a.valMinimoVendido-b.valMinimoVendido);
    const extremes = [sorted[0], sorted[sorted.length-1]];
    extremes.forEach((e,i) => {
      const label = i===0 ? 'Menor preço' : 'Maior preço';
      const when = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const icon = i===0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.nomFantasia||e.nomRazaoSocial||'—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          <div class="card-icon-right"><img src="${icon}" alt=""></div>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank">Ver no mapa</a> | <a href="${dirL}" target="_blank">Como chegar</a></p>
        </div>
      `;
      resultContainer.appendChild(card);
    });
  }

  // Carrega item do cache
  function loadFromCache(item) {
    barcodeInput.value = item.code;
    summaryContainer.innerHTML = `<p><strong>${item.dados.length}</strong> estabelecimento(s) no histórico.</p>`;
    renderCards(item.dados);
  }

  // Ação de busca JSONP
  btnSearch.addEventListener('click', () => {
    const code = barcodeInput.value.trim();
    if (!code) return alert('Digite um código de barras válido.');
    const locType = document.querySelector('input[name="loc"]:checked').value;
    const posPromise = locType==='gps'
      ? new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j))
      : Promise.resolve({ coords: { latitude: parseFloat(document.getElementById('city').value.split(',')[0]), longitude: parseFloat(document.getElementById('city').value.split(',')[1]) } });

    posPromise
      .then(pos => {
        loading.classList.add('active'); btnSearch.textContent='Atualizando...';
        buscarJSONP(code, pos.coords.latitude, pos.coords.longitude, Number(selectedRadius), 3);
      })
      .catch(()=>alert('Não foi possível obter sua localização.'));
  });

  // Inicializa histórico ao carregar
  renderHistory(JSON.parse(localStorage.getItem('searchHistory')||'[]'));
});
