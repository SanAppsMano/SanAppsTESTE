// api/search.js
import axios from "axios";
export default async function handler(req, res) {
  const termo = req.query.q;
  // … resto da lógica …
  res.status(200).json({ /* resultado */ });
}

