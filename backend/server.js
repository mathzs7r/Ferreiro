require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const { pool } = require("./db");
const { createToken, exigirLogin } = require("./auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// Servir o site (pasta raiz do projeto)
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/saude", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ api: "ok", banco: "ok" });
  } catch (err) {
    res.status(500).json({ api: "ok", banco: "erro", detalhe: err.message });
  }
});

app.get("/api/produtos", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT CODIGO AS id, NOME AS nome, DESCRICAO AS descricao, PRECO AS preco FROM PRODUTO WHERE ATIVO = 1 ORDER BY ID"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/cadastro", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body || {};
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });
    }
    if (String(senha).length < 4) {
      return res.status(400).json({ erro: "Senha deve ter pelo menos 4 caracteres." });
    }

    const hash = bcrypt.hashSync(String(senha), 10);
    const [result] = await pool.query(
      "INSERT INTO CLIENTE (NOME, EMAIL, TELEFONE, SENHA) VALUES (?, ?, ?, ?)",
      [nome.trim(), email.trim().toLowerCase(), telefone || null, hash]
    );

    const cliente = {
      id: result.insertId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
    };
    const token = createToken(cliente);
    res.status(201).json({ mensagem: "Cadastro realizado!", cliente, token });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    }
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    const [rows] = await pool.query(
      "SELECT ID, NOME, EMAIL, SENHA FROM CLIENTE WHERE EMAIL = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const row = rows[0];
    const ok = bcrypt.compareSync(String(senha), row.SENHA);
    if (!ok) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const cliente = { id: row.ID, nome: row.NOME, email: row.EMAIL };
    const token = createToken(cliente);
    res.json({ mensagem: "Login ok", cliente, token });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/me", exigirLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT ID AS id, NOME AS nome, EMAIL AS email, TELEFONE AS telefone FROM CLIENTE WHERE ID = ?",
      [req.cliente.id]
    );
    if (!rows.length) return res.status(404).json({ erro: "Cliente não encontrado." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/pedidos", exigirLogin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    if (!itens.length) {
      return res.status(400).json({ erro: "Carrinho vazio." });
    }

    let total = 0;
    const normalizados = itens.map((i) => {
      const qty = Number(i.quantidade || i.qty || 1);
      const preco = Number(i.preco || i.price);
      if (!i.id || !i.nome || !qty || !preco) {
        throw Object.assign(new Error("Item inválido no pedido."), { status: 400 });
      }
      total += qty * preco;
      return {
        codigo: String(i.id),
        nome: String(i.nome),
        preco,
        quantidade: qty,
      };
    });

    await conn.beginTransaction();

    const [pedidoResult] = await conn.query(
      "INSERT INTO PEDIDO (CLIENTE_ID, TOTAL, STATUS) VALUES (?, ?, 'recebido')",
      [req.cliente.id, total]
    );
    const pedidoId = pedidoResult.insertId;

    for (const item of normalizados) {
      await conn.query(
        `INSERT INTO PEDIDO_ITEM (PEDIDO_ID, PRODUTO_CODIGO, NOME, PRECO_UNITARIO, QUANTIDADE)
         VALUES (?, ?, ?, ?, ?)`,
        [pedidoId, item.codigo, item.nome, item.preco, item.quantidade]
      );
    }

    await conn.commit();
    res.status(201).json({
      mensagem: "Pedido registrado!",
      pedidoId,
      total,
    });
  } catch (err) {
    await conn.rollback();
    const status = err.status || 500;
    res.status(status).json({ erro: err.message });
  } finally {
    conn.release();
  }
});

app.get("/api/pedidos", exigirLogin, async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      `SELECT ID AS id, TOTAL AS total, STATUS AS status, CRIADO_EM AS criadoEm
       FROM PEDIDO WHERE CLIENTE_ID = ? ORDER BY ID DESC LIMIT 20`,
      [req.cliente.id]
    );
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Ferreiro do Sabor em http://localhost:${PORT}`);
  console.log(`Site: http://localhost:${PORT}/index.html`);
  if (!process.env.AUTH_SECRET) {
    console.warn("AVISO: AUTH_SECRET não definido no .env — usando segredo temporário.");
  }
});
