/* app.js */
// front-end: chama o proxy interno em Vercel Functions
// URL do seu backend Vercel:
const API_PROXY = 'https://san-apps-teste.vercel.app';

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
  function renderCards(dados) {
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a,b)=>a.valMinimoVendido-b.valMinimoVendido);
    const [menor,maior] = [sorted[0], sorted[sorted.length-1]];
    [menor,maior].forEach((e,i)=>{
      const label = i===0?'Menor preço':'Maior preço';
      const icon  = i===0?'public/images/ai-sim.png':'public/images/eita.png';
      const when  = e.dthEmissaoUltimaVenda?new Date(e.dthEmissaoUltimaVenda).toLocaleString():'—';
      const price = brlFormatter.format(e.valMinimoVendido);
      const color = i===0?'#28a745':'#dc3545';
      const mapURL= `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirURL= `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const card  = document.createElement('div'); card.className='card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.nomFantasia||e.nomRazaoSocial||'—'}</div>
        <div class="card-body">
          <p><strong>Preço:</strong> <span style="color:${color}">${price}</span></p>
          <div class="card-icon-right"><img src="${icon}" alt="${label}"></div>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p><strong>Descrição:</strong> ${e.dscProduto||'—'}</p>
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
    const dados = item.dados; barcodeInput.value=item.code;
    summaryContainer.innerHTML=`
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${item.image||'https://via.placeholder.com/150'}" alt="${item.name}" />
          <div class="product-name-overlay">${item.name}</div>
        </div>
        <p><strong>${dados.length}</strong> estabelecimento(s) no histórico.</p>
      </div>`;
    currentResults=dados; renderCards(dados);
  }

  // Busca principal via Vercel Functions proxy
  btnSearch.addEventListener('click',async()=>{
    const code=barcodeInput.value.trim(); if(!code) return alert('Digite um código de barras.');
    loading.classList.add('active'); resultContainer.innerHTML=''; summaryContainer.innerHTML='';
    let lat,lng; const loc=document.querySelector('input[name="loc"]:checked').value;
    if(loc==='gps'){try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej));lat=pos.coords.latitude;lng=pos.coords.longitude;}catch{loading.classList.remove('active');return alert('Não foi possível obter localização.');}}else{[lat,lng]=document.getElementById('city').value.split(',').map(Number);}    
    try{
      const resp=await fetch(`${API_PROXY}/api/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigoDeBarras:code,latitude:lat,longitude:lng,raio:Number(selectedRadius),dias:7})});
      const data=await resp.json(); loading.classList.remove('active');
      const lista=Array.isArray(data.conteudo)?data.conteudo:[]; if(!lista.length){summaryContainer.innerHTML='<p>Nenhum estabelecimento encontrado.</p>';return;}
      const primeiro=lista[0]; const productName=primeiro.dscProduto||'Produto não identificado';
      const productImg=primeiro.codGetin?`https://cdn-cosmos.bluesoft.com.br/products/${primeiro.codGetin}`:'';
      summaryContainer.innerHTML=`
        <div class="product-header">
          <div class="product-image-wrapper">
            <img src="${productImg||'https://via.placeholder.com/150'}" alt="${productName}" />
            <div class="product-name-overlay">${productName}</div>
          </div>
          <p><strong>${lista.length}</strong> estabelecimento(s) encontrado(s).</p>
        </div>`;
      historyArr.unshift({code,name:productName,image:productImg,dados:lista}); saveHistory(); renderHistory(); currentResults=lista; renderCards(lista);
    }catch(e){loading.classList.remove('active');alert('Erro na busca.');}
  });

  // Busca por descrição via Vercel Functions proxy
  const openDescBtn=document.getElementById('open-desc-modal');
  const descModal=document.getElementById('desc-modal');
  const closeDescBtn=document.getElementById('close-desc-modal');
  const btnDescSearch=document.getElementById('btn-desc-search');
  const descInput=document.getElementById('desc-input');
  const descList=document.getElementById('desc-list');

  openDescBtn.addEventListener('click',()=>{descList.innerHTML='';descModal.classList.add('active');});
  closeDescBtn.addEventListener('click',()=>descModal.classList.remove('active'));

  btnDescSearch.addEventListener('click',async()=>{
    const termo=descInput.value.trim();if(!termo)return alert('Informe a descrição!');
    descList.innerHTML='';loading.classList.add('active');
    let lat,lng;const locType=document.querySelector('input[name="loc"]:checked').value;
    if(locType==='gps'){try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej));lat=pos.coords.latitude;lng=pos.coords.longitude;}catch{loading.classList.remove('active');return alert('Não foi possível obter localização.');}}else{[lat,lng]=document.getElementById('city').value.split(',').map(Number);}    
    try{const resp=await fetch(`${API_PROXY}/api/searchDescricao`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({descricao:termo,latitude:lat,longitude:lng,raio:Number(selectedRadius),dias:7})});
      const json=await resp.json();loading.classList.remove('active'); const itens=Array.isArray(json.conteudo)?json.conteudo:[];if(!itens.length)return descList.innerHTML='<li>Nenhum produto encontrado.</li>';
      itens.forEach(entry=>{ const li=document.createElement('li');li.innerHTML=`<strong>${entry.produto.gtin}</strong> – ${entry.produto.descricao}`;li.addEventListener('click',()=>{barcodeInput.value=entry.produto.gtin;descModal.classList.remove('active');});descList.appendChild(li);});
    }catch(e){loading.classList.remove('active');alert('Erro na busca por descrição: '+e.message);}  
  });
});
