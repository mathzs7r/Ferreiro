# O Ferreiro do Sabor

Site + **API** + **MySQL** da hamburgueria artesanal **O Ferreiro do Sabor** (Ponta Grossa – PR).

## O que tem

- Site moderno (cardápio, carrinho, toasts)
- **Login e cadastro** de clientes
- **API REST** (Express + MySQL + bcrypt + token)
- Pedidos salvos no banco quando o cliente está logado

## Estrutura

```
Ferreiro/
├── index.html, login.html, cadastro.html, Suporte.html
├── style.css, auth.css, suporte.css
├── script.js, auth.js
├── database/
│   └── schema.sql          # cria banco, tabelas e produtos
└── backend/
    ├── server.js           # API + serve o site
    ├── db.js
    ├── auth.js             # token HMAC
    ├── package.json
    └── .env.example
```

## Banco de dados

```bash
mysql -u root -p < database/schema.sql
```

Tabelas: `CLIENTE`, `PRODUTO`, `PEDIDO`, `PEDIDO_ITEM`.

## API (backend)

```bash
cd backend
npm install
copy .env.example .env     # Windows
# cp .env.example .env     # Mac/Linux
# edite DB_PASSWORD e AUTH_SECRET no .env
npm start
```

Abra: **http://localhost:3000**

### Rotas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/saude` | — | Status da API/banco |
| GET | `/api/produtos` | — | Lista produtos |
| POST | `/api/cadastro` | — | Criar conta |
| POST | `/api/login` | — | Entrar |
| GET | `/api/me` | Bearer | Dados do cliente |
| POST | `/api/pedidos` | Bearer | Criar pedido |
| GET | `/api/pedidos` | Bearer | Histórico |

### Exemplo de cadastro

```bash
curl -X POST http://localhost:3000/api/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Matheus","email":"teste@email.com","senha":"1234"}'
```

## Fluxo no site

1. Cadastre-se em `cadastro.html` ou entre em `login.html`
2. Adicione itens ao carrinho
3. **Finalizar pedido** grava no MySQL (precisa estar logado)
4. Sem login, o site redireciona para a tela de entrar

## Autor

[mathzs7r](https://github.com/mathzs7r)
