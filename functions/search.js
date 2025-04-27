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

  try {
    // Parse and validate request body
    const { codigoDeBarras, descricao, latitude, longitude, dias = 3, raio = 15 } = JSON.parse(event.body);
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Latitude e longitude devem ser números.' }),
      };
    }

    // Determine endpoint and payload based on search type
    let apiUrl, payload;
    if (descricao) {
      apiUrl = 'https://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';
      payload = {
        produto: { descricao: descricao.toUpperCase() },
        estabelecimento: { geolocalizacao: { latitude, longitude, raio } },
        dias,
        pagina: 1,
        registrosPorPagina: 50,
      };
    } else {
      apiUrl = 'https://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras';
      payload = { codigoDeBarras, dias, latitude, longitude, raio };
    }

    // Fetch data from SEFAZ API
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    return {
      statusCode: resp.ok ? 200 : resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
