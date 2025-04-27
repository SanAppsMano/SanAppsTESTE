// api/hello.js
module.exports = (req, res) => {
  res.status(200).json({
    message: "Olá da Vercel Function!",
    now: new Date().toISOString(),
  });
};
