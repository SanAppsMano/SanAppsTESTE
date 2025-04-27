// api/hello.js
export default async function handler(req, res) {
  res.status(200).json({
    message: "Olá da Vercel Function!",
    now: new Date().toISOString(),
  });
}
