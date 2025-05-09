// File: api/searchDescricao.js
export default async function handler(req, res) {
  // Habilita CORS para qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const {
      descricao,
      latitude = -9.6432331,
      longitude = -35.7190686,
      dias = 3,
      raio = 15
    } = req.body;

    if (!descricao || typeof descricao !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "descricao" é obrigatório.' });
    }

    const apiUrl = 'http://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorDescricao';
    const payload = { descricao, dias, latitude, longitude, raio };

    const apiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify(payload)
    });
    const data = await apiResp.json();

    if (!apiResp.ok) {
      return res.status(apiResp.status).json({ error: data.message || 'Erro na API externa.' });
    }

    // Normaliza resposta para array de resultados
    let results;
    if (Array.isArray(data)) {
      results = data;
    } else if (Array.isArray(data.content)) {
      results = data.content;
    } else if (Array.isArray(data.lista)) {
      results = data.lista;
    } else {
      results = [data];
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error('searchDescricao error:', err);
    return res.status(502).json({ error: 'Erro na busca por descrição.' });
  }
}
