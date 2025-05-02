document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active'); });

  // Abrir e fechar o modal da descrição
  document.getElementById('open-desc-modal').addEventListener('click', () => {
    document.getElementById('desc-modal').classList.add('active');
  });
  document.getElementById('close-desc-modal').addEventListener('click', () => {
    document.getElementById('desc-modal').classList.remove('active');
  });
  document.getElementById('desc-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('desc-modal')) {
      document.getElementById('desc-modal').classList.remove('active');
    }
  });

  // Função de busca por descrição
  document.getElementById('btn-desc-search').addEventListener('click', async () => {
    const descricao = document.getElementById('desc-input').value.trim();
    const listEl = document.getElementById('desc-list');
    listEl.innerHTML = '';
    if (!descricao) return alert('Digite uma descrição.');

    loading.classList.add('active');
    let lat, lng;
    if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        loading.classList.remove('active');
        return alert('Não foi possível obter localização.');
      }
    } else {
      [lat, lng] = document.getElementById('city').value.split(',').map(Number);
    }

    try {
      const diasEscolhidos = Number(daysRange.value);
      const resp = await fetch(`${API_PROXY}/api/searchDescricao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, latitude: lat, longitude: lng, dias: diasEscolhidos, raio: Number(selectedRadius) })
      });
      const data = await resp.json();
      loading.classList.remove('active');

      const list = Array.isArray(data.conteudo) ? data.conteudo : [];
      if (!list.length) return listEl.innerHTML = '<li>Nenhum resultado encontrado.</li>';

      list.forEach(e => {
        const p = e.produto;
        const est = e.estabelecimento;
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${p.descricaoSefaz || p.descricao}</strong><br/>
          Preço: R$ ${p.venda.valorVenda.toFixed(2)}<br/>
          Estabelecimento: ${est.nomeFantasia || est.razaoSocial}<br/>
          Local: ${est.endereco.nomeLogradouro}, ${est.endereco.numeroImovel} - ${est.endereco.bairro}, ${est.endereco.municipio}
        `;
        listEl.appendChild(li);
      });
    } catch (err) {
      loading.classList.remove('active');
      alert('Erro ao buscar por descrição.');
    }
  });

});
