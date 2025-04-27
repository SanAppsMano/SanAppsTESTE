// functions/searchDescricao.js
// Netlify Function dedicada à busca por descrição de produto

exports.handler = async function(event) {
  // Suporte a CORS preflight
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

  // Faz parse do corpo da requisição
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }),
    };
  }

  const { descricao, latitude, longitude, dias = 3, raio = 15 } = body;

  // Valida parâmetros obrigatórios
  if (!descricao || typeof descricao !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Parâmetro "descricao" é obrigatório e deve ser string.' }),
    };
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Latitude e longitude devem ser números.' }),
    };
  }

  // Monta payload para API Economiza Alagoas
  const apiUrl = 'https://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';
  const payload = {
    produto: { descricao: descricao.toUpperCase() },
    estabelecimento: { geolocalizacao: { latitude, longitude, raio } },
    dias,
    pagina: 1,
    registrosPorPagina: 50,
  };

  try {
    // Chama endpoint externo
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
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Falha ao chamar API externa', details: err.message }),
    };
  }
};
