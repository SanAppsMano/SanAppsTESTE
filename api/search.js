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

    // Usando endpoint oficial SEFAZ/AL produto/pesquisa
    const apiUrl = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';

    const apiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify({
        produto: { gtin: codigoDeBarras },
        estabelecimento: {
          geolocalizacao: {
            latitude,
            longitude,
            raio
          }
        },
        dias,
        pagina: 1,
        registrosPorPagina: 100
      })
    });

    const data = await apiResp.json();
    return res.status(apiResp.ok ? 200 : apiResp.status).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar preços.' });
  }
}
