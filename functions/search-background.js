// functions/search-background.js

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    // Parse request body
    const {
      codigoDeBarras,
      latitude,
      longitude,
      dias = 3,
      raio = 15
    } = JSON.parse(event.body);

    // Validate required params
    if (
      typeof codigoDeBarras !== "string" ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Parâmetros inválidos" }),
      };
    }

    // Log for debugging
    console.log("Background job: iniciando busca para", codigoDeBarras);

    // Call external API (may take > 10s)
    const apiUrl = "https://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras";
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AppToken": process.env.APP_TOKEN,
      },
      body: JSON.stringify({ codigoDeBarras, dias, latitude, longitude, raio }),
    });

    const data = await resp.json();
    console.log("Background job: dados recebidos", JSON.stringify(data).slice(0, 200));

    // TODO: Persistir 'data' em banco, cache ou storage para consulta posterior.

    // Retorna imediatamente ao cliente
    return {
      statusCode: 202,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Busca iniciada em background" }),
    };

  } catch (err) {
    console.error("Erro no handler de background:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
