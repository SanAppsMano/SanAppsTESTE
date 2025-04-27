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
    // Parse request
    const { codigoDeBarras, descricao, latitude, longitude, dias = 3, raio = 15 } = JSON.parse(event.body);

        // Unified search (by descricao or gtin)
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
    const apiUrl = 'https://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': process.env.APP_TOKEN
      },
      body: JSON.stringify({ codigoDeBarras, dias, latitude, longitude, raio })
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
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
