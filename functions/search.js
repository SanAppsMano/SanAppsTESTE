// functions/search.js

exports.handler = async function(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' })
    };
  }

  const { codigoDeBarras, descricao, latitude, longitude, dias = 3, raio = 15 } = body;

  // Validate location
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Latitude e longitude devem ser números.' })
    };
  }

  // Validate search criteria
  if (!descricao && !codigoDeBarras) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Informe descrição ou código de barras.' })
    };
  }

  // Use Economiza Alagoas API for both barcode (gtin) and description
  const apiUrl = 'https://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';
  const payload = {
    produto: descricao
      ? { descricao: descricao.toUpperCase() }
      : { gtin: codigoDeBarras },
    estabelecimento: { geolocalizacao: { latitude, longitude, raio } },
    dias,
    pagina: 1,
    registrosPorPagina: 50
  };

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    return {
      statusCode: resp.ok ? 200 : resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Erro ao chamar a API externa.', details: err.message })
    };
  }
};
