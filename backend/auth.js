const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "ferreiro-dev-secret-change-me";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function createToken(cliente) {
  return sign({
    id: cliente.id,
    nome: cliente.nome,
    email: cliente.email,
    exp: Date.now() + TTL_MS,
  });
}

function exigirLogin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const data = verify(token);
  if (!data) {
    return res.status(401).json({ erro: "Faça login para continuar." });
  }
  req.cliente = data;
  next();
}

module.exports = { createToken, verify, exigirLogin };
