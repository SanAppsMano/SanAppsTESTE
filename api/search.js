// File: api/search.js
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
      codigoDeBarras,
      latitude,
      longitude,
      dias = 3,
      raio = 15
    } = req.body;

    // Validação básica
    if (!codigoDeBarras || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const apiUrl = 'http://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras';
    const apiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify({ codigoDeBarras, dias, latitude, longitude, raio })
    });
    const data = await apiResp.json();

    return res.status(apiResp.ok ? 200 : apiResp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar preços.' });
  }
}
