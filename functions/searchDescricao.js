// functions/searchDescricao.js
// Function dedicada à busca por descrição de produto usando HTTPS nativo

const http = require('http');
const https = require('https');

function postJson(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname, search, protocol } = new URL(url);
    const options = {
      hostname,
      port: port || (protocol === 'https:' ? 443 : 80),
      path: pathname + (search || ''),
      method: 'POST',
      headers,
    };
    const req = (protocol === 'https:' ? https : http).request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Resposta não é JSON válido'));  
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

exports.handler = async function(event) {
  // CORS preflight
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

  // Parse do corpo
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }),
    };
  }

  const { descricao, latitude, longitude, dias = 3, raio = 15 } = body;
  if (!descricao || typeof descricao !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Parâmetro "descricao" é obrigatório.' }),
    };
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Latitude e longitude devem ser números.' }),
    };
  }

  const apiUrl = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/produto/pesquisa';
  const payload = {
    produto: { descricao: descricao.toUpperCase() },
    estabelecimento: { geolocalizacao: { latitude, longitude, raio } },
    dias,
    pagina: 1,
    registrosPorPagina: 50,
  };
  const headers = {
    'Content-Type': 'application/json',
    'AppToken': process.env.APP_TOKEN,
  };

  try {
    const { status, json } = await postJson(apiUrl, headers, payload);
    return {
      statusCode: status >= 200 && status < 300 ? 200 : status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(json),
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
