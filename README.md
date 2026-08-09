# Estratégia Tributária — app interno

Fases 1-4 do projeto, reescritas como aplicação real: Next.js (frontend + backend
na mesma base de código) + Postgres via Prisma. Pronta para rodar fora do Claude,
em um site próprio.

## O que muda em relação ao protótipo

- As chamadas de IA e a consulta de CNPJ agora rodam no servidor (`app/api/...`),
  não no navegador — a chave da Anthropic nunca fica exposta ao usuário.
- Os dados ficam em um banco Postgres de verdade, não mais no armazenamento do artefato.
- A estrutura já separa `Client` (perfil da empresa) de `Meeting` (cada reunião),
  exatamente como a Fase 4 exigia.

## Passo a passo para colocar no ar (sem precisar saber programar a fundo)

Isso leva uns 20-30 minutos na primeira vez. Você vai precisar de três contas
gratuitas: GitHub, Neon (banco de dados) e Vercel (hospedagem).

### 1. Suba o código para o GitHub
1. Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. Crie um repositório novo (pode ser privado).
3. Faça upload de todos os arquivos desta pasta para o repositório (pelo site
   do GitHub mesmo, arrastando os arquivos, ou usando `git push` se preferir).

### 2. Crie o banco de dados (Neon — Postgres gratuito)
1. Crie uma conta em [neon.tech](https://neon.tech).
2. Crie um novo projeto/banco.
3. Copie a **connection string** (algo como `postgresql://usuario:senha@...`).

### 3. Pegue sua chave da Anthropic
1. Acesse [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Crie uma chave nova e copie o valor (começa com `sk-ant-...`).
3. Guarde um cartão configurado nessa conta — as chamadas de IA da Fase 2/3
   consomem créditos de API (isso é separado da sua assinatura do Claude.ai).

### 4. Publique no Vercel
1. Crie uma conta em [vercel.com](https://vercel.com) (dá para entrar direto com o GitHub).
2. Clique em "Add New Project" e selecione o repositório que você criou.
3. Antes de clicar em "Deploy", abra "Environment Variables" e adicione:
   - `DATABASE_URL` → a connection string do Neon
   - `ANTHROPIC_API_KEY` → a chave que você gerou
4. Clique em "Deploy". Em ~2 minutos o Vercel te dá uma URL pública (algo como
   `seu-projeto.vercel.app`) — é o link que você vai usar nas reuniões.

### 5. Crie as tabelas no banco (uma vez só)
Depois do primeiro deploy, rode este comando na sua máquina (com Node.js
instalado), dentro da pasta do projeto, apontando para o mesmo `DATABASE_URL`
que você colocou no Vercel:

```bash
npm install
npx prisma migrate dev --name init
```

Isso cria as tabelas `Client` e `Meeting` no Neon. Só precisa rodar uma vez
(e de novo no futuro, só se o `schema.prisma` mudar).

### Testar localmente antes de publicar (opcional)
```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL e ANTHROPIC_API_KEY
npx prisma migrate dev --name init
npm run dev
```
Abre em `http://localhost:3000`.

## Estrutura do projeto

```
app/
  page.jsx                                  → carteira de clientes (Fase 1)
  novo/page.jsx                             → cadastro de novo cliente (Fase 1)
  clientes/[cnpj]/page.jsx                  → ficha + histórico (Fases 1 e 4)
  clientes/[cnpj]/reunioes/[meetingId]/     → roteiro + documento vivo (Fases 2 e 3)
  api/cnpj/                                 → consulta BrasilAPI (servidor)
  api/clients/                              → CRUD de clientes
  api/meetings/                             → criação/atualização de reuniões
  api/roteiro/, api/followup/, api/analise/ → chamadas de IA (servidor)
prisma/schema.prisma                        → modelo do banco (Client, Meeting)
lib/                                        → helpers compartilhados
components/ui.jsx                           → componentes de tela reutilizados
```

## Pontos de atenção antes de usar com clientes de verdade

- **Custo de API**: a análise ao vivo (Fase 3) chama a IA a cada resposta
  preenchida, com busca na web ativada — isso tem custo por chamada. Vale
  acompanhar o consumo no console da Anthropic nas primeiras reuniões.
- **Sem autenticação ainda**: qualquer pessoa com a URL do Vercel acessa o
  sistema — não há login. Isso é proposital (Fase 5, ainda não iniciada);
  para uso hoje, trate a URL como você trataria uma senha.
- **Sem política de retenção/LGPD formalizada**: os dados dos seus clientes
  (CNPJ, respostas de reunião) ficam armazenados indefinidamente no Neon.
  Isso também é parte do escopo da Fase 5.
