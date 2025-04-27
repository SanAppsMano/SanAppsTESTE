// File: api/searchDescricao.js
export default async function handler(req, res) {
  // Habilita CORS para qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const {
      descricao,
      latitude,
      longitude,
      dias = 3,
      raio = 15
    } = req.body;

    if (!descricao || typeof descricao !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "descricao" é obrigatório.' });
    }

    const apiUrl = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';
    const payload = {
      produto: { descricao: descricao.toUpperCase() },
      estabelecimento: { geolocalizacao: { latitude, longitude, raio } },
      dias,
      pagina: 1,
      registrosPorPagina: 50
    };

    const apiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify(payload)
    });
    const data = await apiResp.json();

    return res.status(apiResp.ok ? 200 : apiResp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'Erro na busca por descrição.' });
  }
}
