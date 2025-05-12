// app.js
// Mantém lógica original, com captura de foto, busca por barcode e agora busca por descrição via modal

const API_PROXY = 'https://san-apps-teste.vercel.app';
const COSMOS_BASE = 'https://cdn-cosmos.bluesoft.com.br/products';

window.addEventListener('DOMContentLoaded', () => {
  // ===== Lightbox de imagem =====
  ;(function() {
    const lb = document.createElement('div'); lb.id = 'lightbox';
    Object.assign(lb.style, {
      position:'fixed', top:0, left:0, width:'100%', height:'100%',
      background:'rgba(0,0,0,0.8)', display:'none',
      alignItems:'center', justifyContent:'center', zIndex:10000, cursor:'zoom-out'
    });
    const img = document.createElement('img'); img.id = 'lightbox-img';
    Object.assign(img.style, { maxWidth:'90%', maxHeight:'90%', boxShadow:'0 0 8px #fff' });
    lb.appendChild(img);
    lb.addEventListener('click', () => lb.style.display = 'none');
    document.body.appendChild(lb);
  })();

  // ===== DOM elements originais =====
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

  // ===== Busca por Descrição (modal) =====
  const DEFAULT_DIAS_DESC = 7;
  const DEFAULT_RAIO_DESC = 15;

  // Referências ao modal e seus controles
  const openDescBtn      = document.getElementById('open-desc-modal');
  const descModal        = document.getElementById('desc-modal');
  const closeDescBtn     = document.getElementById('close-desc-modal');
  const descInput        = document.getElementById('desc-modal-input');
  const descDatalist     = document.getElementById('desc-modal-list');
  const descSearchBtn    = document.getElementById('desc-modal-search');
  const descCountEl      = document.getElementById('desc-modal-count');
  const descCatalog      = document.getElementById('desc-modal-catalog');

  // Abrir / fechar modal
openDescBtn.addEventListener('click', () => {
  // limpa tudo
  descInput.value        = '';
  descDatalist.innerHTML = '';
  descCatalog.innerHTML  = '';
  descCountEl.hidden     = true;
  // abre modal
  descModal.classList.add('active');
  // dá foco automático ao input de descrição
  descInput.focus();
});

  closeDescBtn.addEventListener('click', () => descModal.classList.remove('active'));
  descModal.addEventListener('click', e => {
    if (e.target === descModal) descModal.classList.remove('active');
  });

// Chama o endpoint serverless de descrição
async function searchByDescription(desc) {
  let lat, lng;
  if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej)
    );
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } else {
    [lat, lng] = document.getElementById('city').value.split(',').map(Number);
  }

  const payload = {
    descricao: desc,
    dias:      DEFAULT_DIAS_DESC,
    raio:      DEFAULT_RAIO_DESC,
    latitude:  lat,
    longitude: lng
  };

  const res = await fetch(`${API_PROXY}/api/searchDescricao`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });

  // Tratamento específico para 502
  if (res.status === 502) {
    throw new Error('Serviço temporariamente indisponível. Tente novamente em instantes.');
  }
  // Tratamento genérico para outros erros HTTP
  if (!res.ok) {
    throw new Error(`Erro na busca por descrição: Status ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.content || []);
}

  // Renderiza catálogo de cards no modal, agrupando por GTIN único e ignorando sem GTIN
  async function renderDescriptionCatalog() {
    const desc = descInput.value.trim();
    if (!desc) return alert('Informe uma descrição.');

    descCatalog.innerHTML  = '';
    descDatalist.innerHTML = '';
    descCountEl.hidden     = true;

    try {
      const items = await searchByDescription(desc);

      // filtra só os que têm GTIN (codGetin)
      const validItems = items.filter(i => i.codGetin);

      // popula sugestões únicas por descrição
      const seenDesc = new Set();
      validItems.forEach(i => {
        if (i.dscProduto && !seenDesc.has(i.dscProduto)) {
          const opt = document.createElement('option');
          opt.value = i.dscProduto;
          descDatalist.appendChild(opt);
          seenDesc.add(i.dscProduto);
        }
      });

      // agrupar por GTIN único
      const mapUnicos = new Map();
      validItems.forEach(i => {
        if (!mapUnicos.has(i.codGetin)) {
          mapUnicos.set(i.codGetin, i);
        }
      });
      const uniItems = Array.from(mapUnicos.values());

      // criar cards
      uniItems.forEach(i => {
        const card = document.createElement('div');
        card.className    = 'card';
        card.dataset.gtin = i.codGetin;
        card.dataset.desc = i.dscProduto;
        card.innerHTML    = `
          <img src="${COSMOS_BASE}/${i.codGetin}" alt="${i.dscProduto}">
          <div class="gtin">${i.codGetin}</div>
          <div class="desc">${i.dscProduto}</div>
        `;
        card.addEventListener('click', () => {
          barcodeInput.value = i.codGetin;
          descModal.classList.remove('active');
          btnSearch.click();
        });
        descCatalog.appendChild(card);
      });

      descCountEl.textContent =
        `${uniItems.length} item${uniItems.length !== 1 ? 's' : ''} encontrado${uniItems.length !== 1 ? 's' : ''}.`;
    } catch (err) {
      alert('Erro na busca por descrição: ' + err.message);
    } finally {
      descCountEl.hidden = false;
    }
  }

  // Barra de progresso no botão de busca por descrição
descSearchBtn.addEventListener('click', async () => {
  // guarda o HTML original (ícone + texto)
  const originalHTML = descSearchBtn.innerHTML;

  // desativa e mostra spinner de FontAwesome
  descSearchBtn.disabled = true;
  descSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    await renderDescriptionCatalog();
  } finally {
    // restaura botão
    descSearchBtn.disabled = false;
    descSearchBtn.innerHTML = originalHTML;
    // opcional: limpa o campo
    descInput.value = '';
  }
});

  // filtro ao digitar na descrição
  descInput.addEventListener('input', () => {
    const filter = descInput.value.toLowerCase();
    Array.from(descCatalog.children).forEach(card => {
      card.style.display = card.dataset.desc.toLowerCase().includes(filter) ? 'flex' : 'none';
    });
  });

  // ===== Fim: Busca por Descrição =====

  // ===== Botão de scan e captura de foto =====
  const btnScan    = document.getElementById('btn-scan');
  const photoInput = document.getElementById('photo-input');
  btnScan.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async () => {
    if (!photoInput.files?.length) return;
    const file = photoInput.files[0];
    const imgUrl = URL.createObjectURL(file);
    let code = '';

    // BarcodeDetector nativo
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({ formats:['ean_13','ean_8'] });
        const bitmap  = await createImageBitmap(file);
        const [c]     = await detector.detect(bitmap);
        code = c?.rawValue || '';
      } catch(e){ console.warn('BarcodeDetector falhou:', e) }
    }
    // QuaggaJS fallback
    if (!code) {
      await new Promise(res => {
        Quagga.decodeSingle({
          src: imgUrl, numOfWorkers:0, locate:true,
          decoder:{ readers:['ean_reader'] }
        }, result => {
          code = result?.codeResult?.code || '';
          res();
        });
      });
    }
    // ZXing.js fallback
    if (!code) {
      await new Promise(res => {
        const img = new Image(); img.src = imgUrl;
        img.onload = () => {
          try {
            const reader = new ZXing.BrowserMultiFormatReader();
            code = reader.decodeFromImageElement(img).getText();
          } catch(err){ console.warn('ZXing falhou:', err) }
          res();
        };
      });
    }
    URL.revokeObjectURL(imgUrl);
    barcodeInput.value = code;
    btnSearch.click();
  });

  // ===== Slider de dias =====
  daysValue.textContent = daysRange.value;
  daysRange.addEventListener('input', () => daysValue.textContent = daysRange.value);

  // ===== Histórico =====
  const brl = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
  let historyArr = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let currentResults = [];
  let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;

  function saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  }
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li = document.createElement('li'); li.className='history-item';
      const btn = document.createElement('button'); btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));
      if (item.image) {
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name;
        btn.appendChild(img);
      } else btn.textContent = item.name;
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

  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  }));

  // ===== Funções auxiliares originais =====
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
    const sortedAll = [...list].sort((a,b) =>
      a.produto.venda.valorVenda - b.produto.venda.valorVenda
    );
    const [menor, maior] = [sortedAll[0], sortedAll[sortedAll.length-1]];
    [menor, maior].forEach((e, i) => {
      const est = e.estabelecimento;
      const end = est.endereco;
      const when = e.produto.venda.dataVenda
        ? new Date(e.produto.venda.dataVenda).toLocaleString()
        : '—';
      const price = brl.format(e.produto.venda.valorVenda);
      const declared = brl.format(e.produto.venda.valorDeclarado)
        + ' ' + e.produto.unidadeMedida;
      const isPromo = e.produto.venda.valorDeclarado !== e.produto.venda.valorVenda;
      const color = i===0 ? '#28a745' : '#dc3545';
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${end.latitude},${end.longitude}`;
      const dirLink = `https://www.google.com/maps/dir/?api=1&destination=${end.latitude},${end.longitude}`;

      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `
        <div class="card-header ${i===0?'highlight-green':'highlight-red'}">
          ${i===0?'Menor preço':'Maior preço'} — ${est.nomeFantasia||est.razaoSocial}
        </div>
        <div class="card-body">
          <div class="info-group">
            <h4>Localização</h4>
            <p>${end.nomeLogradouro}, ${end.numeroImovel}</p>
            <p>${end.bairro} — ${est.municipio||end.municipio}</p>
            <p>CEP: ${end.cep}</p>
          </div>
          <div class="info-group price-section">
            <p><strong>Preço de Venda:</strong> <strong style="color:${color}">${price}</strong></p>
            <p><strong>Valor Declarado:</strong> <strong>${declared}</strong>
            ${isPromo?'<span role="img" aria-label="Promoção">🏷️</span>':''}</p>
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

  // ===== Busca por código de barras original =====
  async function searchByCode() {
    const code = barcodeInput.value.trim();
    if (!code) return alert('Digite um código de barras.');
    loading.classList.add('active');
    resultContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    let lat, lng;
    if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
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
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          codigoDeBarras: code,
          latitude: lat,
          longitude: lng,
          raio: Number(selectedRadius),
          dias: diasEscolhidos
        })
      });
      const data = await resp.json();
      loading.classList.remove('active');
      const list = Array.isArray(data.conteudo) ? data.conteudo : [];
      if (!list.length) {
        summaryContainer.innerHTML = `<p>Nenhum estabelecimento encontrado.</p>`;
        return;
      }
      historyArr.unshift({
        code,
        name: data.dscProduto || list[0].produto.descricao,
        image: `${COSMOS_BASE}/${list[0].produto.gtin}`,
        dados: list
      });
      saveHistory();
      renderHistory();
      renderSummary(list);
      currentResults = list;
      renderCards(list);
    } catch {
      loading.classList.remove('active');
      alert('Erro na busca.');
    }
  }
  btnSearch.addEventListener('click', searchByCode);

  // ===== Modal lista ordenada =====
  document.getElementById('open-modal').addEventListener('click', () => {
    if (!currentResults.length) return alert('Faça uma busca primeiro.');
    const modal = document.getElementById('modal');
    const listEl = document.getElementById('modal-list');
    listEl.innerHTML = '';
    const sortedAll = [...currentResults].sort((a,b) =>
      a.produto.venda.valorVenda - b.produto.venda.valorVenda
    );
    sortedAll.forEach((e, i) => {
  const est = e.estabelecimento;
  const end = est.endereco;
  const when = e.produto.venda.dataVenda
    ? new Date(e.produto.venda.dataVenda).toLocaleString()
    : '—';
  const price = brl.format(e.produto.venda.valorVenda);
  const declared = brl.format(e.produto.venda.valorDeclarado) + ' ' + e.produto.unidadeMedida;
  const isPromo = e.produto.venda.valorDeclarado !== e.produto.venda.valorVenda;

  // cor: primeiro verde, intermediários azul, último vermelho
  const color = 
    i === 0
      ? '#28a745'
      : i === sortedAll.length - 1
        ? '#dc3545'
        : '#007bff';

  const li = document.createElement('li');
  li.innerHTML = `
    <div class="card">
      <div class="card-header">${est.nomeFantasia||est.razaoSocial}</div>
      <div class="card-body">
        <div class="info-group">
          <h4>Localização</h4>
          <p>${end.nomeLogradouro}, ${end.numeroImovel}</p>
          <p>${end.bairro} — ${est.municipio||end.municipio}</p>
          <p>CEP: ${end.cep}</p>
        </div>
        <div class="info-group price-section">
          <p><strong>Preço de Venda:</strong> <strong style="color:${color}">${price}</strong></p>
          <p><strong>Valor Declarado:</strong> <strong>${declared}</strong>
            ${isPromo?'<span role="img" aria-label="Promoção">🏷️</span>':''}
          </p>
          <p class="price-date">Quando: ${when}</p>
        </div>
      </div>
    </div>`;
  listEl.appendChild(li);
});

    modal.classList.add('active');
  });
  document.getElementById('close-modal').addEventListener('click', () =>
    document.getElementById('modal').classList.remove('active')
  );
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal'))
      document.getElementById('modal').classList.remove('active');
  });
});
// === Fim do app.js ===
