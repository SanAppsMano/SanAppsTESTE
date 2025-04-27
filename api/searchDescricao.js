
// api/searchDescricao.js
import axios from "axios";
export default async function handler(req, res) {
  const desc = req.query.desc;
  // … resto da lógica …
  res.status(200).json(/* dados */);
}
