# Deploy — Mini Fábrica

## Índice

- [Pré-requisitos](#pré-requisitos)
- [1. Supabase (banco de dados)](#1-supabase-banco-de-dados)
- [2. Variáveis de ambiente](#2-variáveis-de-ambiente)
- [3. Vercel](#3-vercel)
- [4. Netlify](#4-netlify)
- [Manutenção](#manutenção)

---

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)
- Repositório no GitHub com o código

---

## 1. Supabase (banco de dados)

### 1.1 Criar projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Defina nome, senha do banco e região
3. Aguarde o provisionamento (~2 min)

### 1.2 Rodar migration

1. No Dashboard do Supabase, vá em **SQL Editor**
2. Abra o arquivo `supabase/migrations/20260624000001_v2_complete.sql`
3. Copie todo o conteúdo e cole no SQL Editor
4. Execute (▶) — todas as tabelas, RLS, RPCs e índices serão criados

### 1.3 Configurar Storage

1. No Dashboard, vá em **Storage** → **New bucket**
2. Nome: `imagem_produto`
3. Política: **público**

### 1.4 Anotar as credenciais

Vá em **Settings** → **API** e copie:

| Chave | Onde usar |
|---|---|
| **Project URL** | `VITE_SUPABASE_URL` |
| **anon / public** | `VITE_SUPABASE_ANON_KEY` |
| **service_role** (❗) | `VITE_SUPABASE_SERVICE_ROLE_KEY` |

A `service_role` key **não** deve ser versionada no `.env.example` — só no ambiente local e nas variáveis de ambiente da Vercel/Netlify.

---

## 2. Variáveis de ambiente

Todas usam o prefixo `VITE_` (obrigatório para expor ao bundle do Vite).

```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_BUCKET="imagem_produto"
```

### Local

```bash
cp .env.example .env
# edite .env com as credenciais reais
npm run dev
```

---

## 3. Vercel

### 3.1 Conectar repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório do GitHub
3. Framework: **Vite**
4. Build command: `npm run build` (já vem preenchido)
5. Output directory: `dist` (já vem preenchido)

### 3.2 Variáveis de ambiente

Em **Environment Variables**, adicione:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `VITE_SUPABASE_BUCKET` | `imagem_produto` |

### 3.3 Deploy

Clique em **Deploy**. A Vercel detecta automaticamente o Vite e faz o build + deploy.

Para ativar deploys automáticos: conecte o repositório → toda push na branch principal gera um novo deploy.

---

## 4. Netlify

### 4.1 Conectar repositório

1. Acesse [netlify.com](https://netlify.com) → **Add new site** → **Import existing project**
2. Conecte ao GitHub e escolha o repositório
3. Branch: `main` (ou a desejada)

### 4.2 Configurar build

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |

### 4.3 Variáveis de ambiente

Em **Environment variables**, adicione:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `VITE_SUPABASE_BUCKET` | `imagem_produto` |

### 4.4 Deploy

Clique em **Deploy site**. A Netlify detecta automaticamente o Vite e faz o build + deploy.

Para deploys automáticos: na push para a branch configurada.

---

## Manutenção

### Atualizar código

```bash
git add .
git commit -m "descrição"
git push
```

Se o repositório estiver conectado, Vercel/Netlify fazem deploy automático.

### Rodar migrations em banco existente

Novas migrations vão na pasta `supabase/migrations/` — execute manualmente no SQL Editor do Supabase.

---

> ⚠️ A chave `service_role` dá acesso administrativo total ao banco (ignora RLS). Ela é necessária para criar/excluir usuários pelo frontend. No modelo multi-instância (cada cliente com seu próprio projeto Supabase), o risco é contido ao projeto daquele cliente. Mantenha-a **fora do `.env.example`** e nunca a versionne.
