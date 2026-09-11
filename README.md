# ROUTS — Backend MVP

Backend mínimo em NestJS para entregar a primeira versão do ROUTS.

## O que ele faz

- Expõe `GET /api/news`
- Consulta a API GNews
- Filtra inicialmente por notícias relacionadas a Rio Verde
- Mantém a chave da GNews somente no backend
- Libera CORS para o frontend local

## 1. Instalar

```bash
npm install
```

## 2. Configurar a chave

Copie:

```text
.env.example
```

para:

```text
.env
```

Depois coloque sua chave em:

```text
GNEWS_API_KEY=SUA_CHAVE
```

## 3. Rodar

```bash
npm run start:dev
```

API:

```text
http://localhost:3000/api/news
```

## Observação

A GNews usa um endpoint de busca por texto. A query padrão deste MVP está em `GNEWS_QUERY`.

A API GNews documenta o endpoint `/api/v4/search` com parâmetros como `q`, `lang`, `country`, `max` e `sortby`.
