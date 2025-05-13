// api/proxy.js

export default async function handler(req, res) {
  // 1) Responde ao preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // 2) URL do seu Apps Script
  const APP_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbyNfQNATH6Q710W6_HAy1RRKg6o6LFzqTB7F3dJLqYREXwc-2tk0P6X4-XH24hM67D0/exec';

  try {
    // 3) Repassa a requisição para o Apps Script
     const fetchRes = await fetch(APP_SCRIPT_URL, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
    });

    const text = await fetchRes.text();

    // 4) Retorna a resposta ao navegador com cabeçalhos CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(fetchRes.status).send(text);

  } catch (err) {
    // 5) Em caso de erro, também libere o CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.toString() });
  }
}
