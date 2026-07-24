# Deploy — Mini Fábrica (Onassys)

Guia completo de implantação, configuração do banco de dados (Supabase), variáveis de ambiente e hospedagem (Vercel, Netlify e GitHub Pages).

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [1. Supabase (Banco de Dados)](#1-supabase-banco-de-dados)
  - [1.1 Criar projeto](#11-criar-projeto)
  - [1.2 Aplicar Migrations (Estrutura + Insumos Iniciais)](#12-aplicar-migrations-estrutura--insumos-iniciais)
  - [1.3 Configurar Storage (Buckets de Imagem e Logo)](#13-configurar-storage-buckets-de-imagem-e-logo)
  - [1.4 Anotar as Credenciais](#14-anotar-as-credenciais)
- [2. Variáveis de Ambiente](#2-variáveis-de-ambiente)
- [3. Deploy na Vercel](#3-deploy-na-vercel)
- [4. Deploy na Netlify](#4-deploy-na-netlify)
- [5. Deploy no GitHub Pages](#5-deploy-no-github-pages)
- [Comandos de Manutenção e Banco](#comandos-de-manutenção-e-banco)

---

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com), [Netlify](https://netlify.com) ou GitHub (para GitHub Pages)
- Node.js v18+ e repositório do projeto clonado

---

## 1. Supabase (Banco de Dados)

### 1.1 Criar projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Defina o nome do projeto, a senha forte do banco de dados (guarde essa senha!) e a região (ex: *South America / São Paulo*).
3. Aguarde o provisionamento do projeto (~2 min).

---

### 1.2 Aplicar Migrations (Estrutura + Insumos Iniciais)

O projeto possui migrations unificadas e idempotentes na pasta `supabase/migrations/`:

| Arquivo de Migration | Descrição |
|---|---|
| `20260718000000_consolidated.sql` | Estrutura consolidada v2: todas as tabelas (materiais, produtos, clientes, pedidos, financeiro, RBAC, etc.), views, RLS e triggers. |
| `20260721000000_seed_materiais_base.sql` | Insumos e ingredientes iniciais da fábrica (Farinha, Açúcar, Ovos, Leite, etc.) cadastrados automaticamente se a tabela estiver vazia. |

Você pode aplicar as migrations de duas formas:

#### Opção A: Via script automático (Recomendado)
1. Preencha a variável `DATABASE_URL` no seu arquivo `.env` local com a Connection String do Supabase (Connection Pooler ou direta).
2. Execute o comando:
   ```bash
   npm run db:migrate
   ```
   O script `aplicar_migrations.mjs` executará todas as migrations em ordem cronológica com suporte a rollback em caso de falha.

#### Opção B: Via SQL Editor do Supabase (Manual)
1. No Dashboard do Supabase, vá em **SQL Editor** → **New Query**.
2. Abra o arquivo `supabase/migrations/20260718000000_consolidated.sql`, copie e cole seu conteúdo no SQL Editor e clique em **Run (▶)**.
3. Abra o arquivo `supabase/migrations/20260721000000_seed_materiais_base.sql`, copie e cole no SQL Editor e clique em **Run (▶)** para popular os insumos iniciais.

---

### 1.3 Configurar Storage (Buckets de Imagem e Logo)

A migration `20260718000000_consolidated.sql` já cria automaticamente os buckets de storage e as políticas de acesso no Supabase. Caso precise verificar no Dashboard (**Storage**):

- `imagem_produto`: Público — Fotos dos produtos cadastrados.
- `logo_empresa`: Público — Logotipo da empresa configurado em Configurações.

---

### 1.4 Anotar as Credenciais

Vá em **Project Settings** → **API** no Supabase e copie:

| Chave | Onde usar | Descrição |
|---|---|---|
| **Project URL** | `VITE_SUPABASE_URL` | URL da API REST/Realtime do projeto |
| **anon / public** | `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do projeto |
| **service_role** (❗) | `VITE_SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa (para gerenciamento de usuários) |
| **Connection String** | `DATABASE_URL` | String PostgreSQL usada nos scripts locais de migration |

> ⚠️ A chave `service_role` dá acesso administrativo total ao banco (ignora RLS). Ela não deve ser exposta no client nem no `.env.example` — use apenas localmente no `.env` e nas variáveis seguras da Vercel/Netlify.

---

## 2. Variáveis de Ambiente

Crie o seu arquivo `.env` local a partir do `.env.example`:

```bash
cp .env.example .env
```

Conteúdo esperado do `.env`:

```env
# Supabase Frontend Credentials
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_BUCKET="imagem_produto"

# Conexão direta PostgreSQL para Scripts / Migrations Locais
DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-1-[REGIAO].pooler.supabase.com:5432/postgres"
```

---

## 3. Deploy na Vercel

### 3.1 Conectar Repositório
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório do GitHub
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`

### 3.2 Variáveis de Ambiente na Vercel
Adicione em **Settings → Environment Variables**:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon Key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Service Role Key |
| `VITE_SUPABASE_BUCKET` | `imagem_produto` |

---

## 4. Deploy na Netlify

### 4.1 Conectar Repositório
1. Acesse [netlify.com](https://netlify.com) → **Add new site** → **Import existing project**
2. Conecte ao GitHub e selecione a branch `main`

### 4.2 Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### 4.3 Variáveis de Ambiente na Netlify
Adicione em **Site configuration → Environment variables**:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon Key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Service Role Key |
| `VITE_SUPABASE_BUCKET` | `imagem_produto` |

---

## 5. Deploy no GitHub Pages

### Configuração de Secrets
Em **Settings → Secrets and variables → Actions → New repository secret**, adicione:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_BUCKET`

### Ativar GitHub Pages
1. **Settings → Pages**
2. Em **Source**, escolha **GitHub Actions**
3. O workflow em `.github/workflows/deploy.yml` compilará a aplicação e publicará no GitHub Pages a cada push na `main`.

---

## Comandos de Manutenção e Banco

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento (Vite) |
| `npm run build` | Compila o projeto TypeScript + Vite para produção na pasta `dist` |
| `npm run typecheck` | Executa a verificação estática de tipos do TypeScript |
| `npm run db:migrate` | Executa automaticamente todas as migrations pendentes na pasta `supabase/migrations/` |
| `npm run db:reset` | Reseta dados do banco de teste |
| `npm run db:clear` | Limpa histórico de movimentações e lançamentos de teste |
| `npm run db:seed:test` | Roda o script de massa de dados de teste |
