// api/proxy.js

export default async function handler(req, res) {
  const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyNfQNATH6Q710W6_HAy1RRKg6o6LFzqTB7F3dJLqYREXwc-2tk0P6X4-XH24hM67D0/exec';

  try {
    // Repassa método, cabeçalhos e corpo
    const fetchRes = await fetch(APP_SCRIPT_URL, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? req.body : undefined
    });

    const text = await fetchRes.text();

    // Retorna o que veio do Apps Script, adicionando CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(fetchRes.status).send(text);

  } catch (err) {
    res.status(500).json({ status: 'error', message: err.toString() });
  }
}
