# 🚀 Deploy no Railway - Guia Rápido

## Pré-requisitos
✅ Arquivos de configuração criados (railway.toml, Dockerfile)
✅ Health check endpoint implementado
✅ Conta no Railway criada

## Passos para Deploy

### 1. Criar Projeto no Railway
1. Acesse https://railway.app
2. Clique em "New Project"
3. Adicione PostgreSQL e Redis

### 2. Conectar Repositório
1. Clique em "+ New"
2. Selecione "GitHub Repo"
3. Escolha: josivantarcio/jtarcio-clinica

### 3. Configurar Variáveis
Use os templates em:
- `.env.railway.template` (Backend)
- `frontend/.env.railway.template` (Frontend)

### 4. Executar Migrações
```bash
railway login
railway link
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

### 5. Gerar Domínios
- Settings → Networking → Generate Domain

## 🔑 Gerar Chaves Seguras
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📚 Documentação Completa
Veja `guia_deploy_railway.md` para instruções detalhadas.
