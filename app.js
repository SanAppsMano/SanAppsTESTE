// app.js
// Mantém toda lógica original, alterando apenas o template dos cards para exibir endereço, CEP e telefone

document.addEventListener('DOMContentLoaded', () => {
  const locRadios = document.querySelectorAll('input[name="loc"]');
  const cityBlock = document.getElementById('city-block');
  const citySel = document.getElementById('city');
  const radiusBtns = document.querySelectorAll('.radius-btn');
  const btnSearch = document.getElementById('btn-search');
  const barcodeIn = document.getElementById('barcode');
  const resultDiv = document.getElementById('result');
  const ulHistory = document.getElementById('history-list');
  const btnClearHist = document.getElementById('clear-history');
  const daysRange = document.getElementById('daysRange');
  const daysValue = document.getElementById('daysValue');

  let history = JSON.parse(localStorage.getItem('history')) || [];

  // Atualiza valor de dias
  daysRange.addEventListener('input', () => {
    daysValue.textContent = daysRange.value;
  });

  // Seleciona radio Municipio/GPS
  locRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      cityBlock.style.display = radio.value === 'city' ? 'block' : 'none';
    });
  });

  // Seleciona valor de raio
  radiusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      radiusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Carrega histórico
  function loadHistory() {
    ulHistory.innerHTML = '';
    history.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ulHistory.appendChild(li);
    });
  }

  loadHistory();

  // Limpar histórico
  btnClearHist.addEventListener('click', () => {
    history = [];
    localStorage.removeItem('history');
    loadHistory();
  });

  // Função de renderização dos cards
  function renderCards(list) {
    resultDiv.innerHTML = '';
    list.forEach(e => {
      const est = e.estabelecimento;
      const end = est.endereco;
      const card = document.createElement('div');
      card.classList.add('card');
      card.innerHTML = `
        <h3>${est.nomeFantasia || est.razaoSocial}</h3>
        <p><strong>Endereço:</strong> ${end.nomeLogradouro}, ${end.numeroImovel} — CEP ${end.cep}</p>
        <p><strong>Telefone:</strong> ${est.telefone}</p>
        <p><strong>Menor Preço:</strong> R$ ${e.menorPreco.toFixed(2)}</p>
        <p><strong>Maior Preço:</strong> R$ ${e.maiorPreco.toFixed(2)}</p>
      `;
      resultDiv.appendChild(card);
    });
  }

  // Função de buscar preços
  async function fetchPrices() {
    const days = daysRange.value;
    const radius = document.querySelector('.radius-btn.active').dataset.value;
    let url;
    if (document.querySelector('input[name="loc"]:checked').value === 'city') {
      const [lat, lon] = citySel.value.split(',');
      url = `${process.env.VITE_API_BASE_URL}/api/precos?lat=${lat}&lon=${lon}&days=${days}&radius=${radius}`;
    } else {
      if (!navigator.geolocation) {
        alert('Geolocalização não suportada');
        return;
      }
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      url = `${process.env.VITE_API_BASE_URL}/api/precos?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&days=${days}&radius=${radius}`;
    }

    document.getElementById('loading').style.display = 'flex';
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      renderCards(data.conteudo);
      // Atualiza histórico
      history.unshift(`Busca em ${new Date().toLocaleString()}`);
      if (history.length > 10) history.pop();
      localStorage.setItem('history', JSON.stringify(history));
      loadHistory();
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar preços. Tente novamente mais tarde.');
    } finally {
      document.getElementById('loading').style.display = 'none';
    }
  }

  // Evento do botão pesquisar
  btnSearch.addEventListener('click', fetchPrices);
  barcodeIn.addEventListener('keyup', e => {
    if (e.key === 'Enter') fetchPrices();
  });
});
