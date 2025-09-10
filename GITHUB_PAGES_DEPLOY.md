# GitHub Pages + Firebase Deploy Guide

Este guia explica como fazer o deploy do EO Clínica usando GitHub Pages (frontend) + Firebase (backend/database).

## 🔧 Pré-requisitos

1. **Conta no GitHub** (gratuita)
2. **Conta no Firebase/Google Cloud** (gratuita)
3. **Node.js 18+** instalado
4. **Firebase CLI** instalada: `npm install -g firebase-tools`

## 📱 Passos para Deploy

### 1. Configurar Firebase Project

```bash
# 1. Login no Firebase
firebase login

# 2. Criar novo projeto
firebase projects:create eo-clinica-demo --display-name "EO Clínica Demo"

# 3. Definir projeto ativo
firebase use eo-clinica-demo

# 4. Inicializar serviços
firebase init firestore
firebase init functions
firebase init hosting
```

### 2. Deploy do Backend (Firebase Functions)

```bash
# Instalar dependências das functions
cd firebase-functions
npm install

# Build e deploy
npm run build
firebase deploy --only functions
```

### 3. Configurar GitHub Repository

1. **Tornar repositório público** (necessário para GitHub Pages gratuito)
2. **Ativar GitHub Pages:**
   - Ir em Settings → Pages
   - Source: "GitHub Actions"
   - Salvar

### 4. Configurar Environment Variables

No GitHub repository, ir em **Settings → Secrets and variables → Actions** e adicionar:

#### Variables (não secrets):
- `NEXT_PUBLIC_API_URL`: `https://eo-clinica-demo.web.app/api`
- `NEXT_PUBLIC_WS_URL`: `wss://eo-clinica-demo.web.app/ws`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: `eo-clinica-demo`
- `NEXT_PUBLIC_FIREBASE_APP_ID`: (seu app ID do Firebase)

### 5. Deploy Automático

1. **Push para branch `github-pages-deploy`:**
```bash
git add .
git commit -m "🚀 feat: Configure GitHub Pages + Firebase deployment"
git push origin github-pages-deploy
```

2. **Aguardar deploy:**
   - GitHub Actions irá executar automaticamente
   - Frontend será publicado em: `https://[seu-usuario].github.io/eo-clinica2`
   - Backend estará em: `https://eo-clinica-demo.web.app/api`

## 🎯 URLs de Acesso

- **Frontend**: `https://[seu-usuario].github.io/eo-clinica2`
- **Backend API**: `https://eo-clinica-demo.web.app/api`
- **Health Check**: `https://eo-clinica-demo.web.app/health`

## 🔐 Credenciais de Teste

- **Email**: `admin@eoclinica.com.br`
- **Senha**: `Admin123!`

## 📊 Recursos Gratuitos

### GitHub Pages
- ✅ Hospedagem gratuita para sites estáticos
- ✅ SSL/HTTPS automático
- ✅ Deploy automático via GitHub Actions
- ✅ Domínio personalizado (opcional)

### Firebase Free Tier
- ✅ **Functions**: 125K invocações/mês
- ✅ **Firestore**: 1GB storage + 50K reads/day + 20K writes/day
- ✅ **Hosting**: 10GB storage + 360MB transferência/dia
- ✅ **Authentication**: Usuários ilimitados

## 🔧 Comandos Úteis

```bash
# Deploy manual das functions
firebase deploy --only functions

# Deploy manual do hosting
firebase deploy --only hosting

# Testar localmente
firebase emulators:start

# Ver logs das functions
firebase functions:log

# Build do frontend para produção
cd frontend && npm run build

# Testar build local
cd frontend && npm start
```

## 🐛 Troubleshooting

### Problema: GitHub Pages não atualiza
**Solução**: Verificar se a GitHub Action executou com sucesso em "Actions"

### Problema: Firebase Function timeout
**Solução**: Aumentar timeout no firebase-functions/src/index.ts:
```typescript
export const api = onRequest({
  timeoutSeconds: 120, // aumentar de 60 para 120
  memory: '1GiB' // aumentar memória se necessário
}, ...)
```

### Problema: CORS error no frontend
**Solução**: Verificar se o domínio está correto no Firebase Function

### Problema: 404 nas rotas do Next.js
**Solução**: GitHub Pages usa trailing slashes, configuração já incluída

## 🚀 Deploy de Produção

Para um deploy real de produção:

1. **Domínio personalizado** no GitHub Pages
2. **Firebase Blaze Plan** (pay-as-you-go)
3. **Environment variables** específicas de produção
4. **Database real** (PostgreSQL no Firebase ou external)
5. **Monitoring** e alertas
6. **Backup** estratégia

## 📚 Recursos Adicionais

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

**Status**: ✅ Configuração completa para GitHub Pages + Firebase
**Custo**: 🆓 Totalmente gratuito para desenvolvimento e testes
**Tempo de setup**: ~15 minutos