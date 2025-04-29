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
    const body = req.body;

    // Suporta ambos formatos: legacy e o novo
    const codigoDeBarras = body.codigoDeBarras
      || body.produto?.gtin;
    const latitude = typeof body.latitude === 'number'
      ? body.latitude
      : body.estabelecimento?.geolocalizacao?.latitude;
    const longitude = typeof body.longitude === 'number'
      ? body.longitude
      : body.estabelecimento?.geolocalizacao?.longitude;
    const raio = body.raio ?? body.estabelecimento?.geolocalizacao?.raio ?? 15;
    const dias = body.dias ?? 3;

    // Validação básica
    if (!codigoDeBarras || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    // Endpoint oficial SEFAZ/AL produto/pesquisa
    const apiUrl = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';

    // Monta o payload conforme manual
    const payload = {
      produto: { gtin: codigoDeBarras },
      estabelecimento: {
        geolocalizacao: { latitude, longitude, raio }
      },
      dias,
      pagina: body.pagina ?? 1,
      registrosPorPagina: body.registrosPorPagina ?? 100
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
    console.error('Erro em api/search.js:', err);
    return res.status(500).json({ error: 'Erro ao buscar preços.' });
  }
}
