// api/hello.js
export default (req, res) => {
  res.status(200).json({
    message: "Olá da Vercel Function!",
    now: new Date().toISOString(),
  });
};
