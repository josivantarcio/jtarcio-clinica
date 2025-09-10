# Cyclic.sh Deploy Guide - EO Clínica

Este guia explica como fazer deploy do EO Clínica no **Cyclic.sh** - uma plataforma gratuita para aplicações fullstack Node.js.

## 🌟 Por que Cyclic.sh?

- ✅ **100% Gratuito** para projetos pessoais
- ✅ **Fullstack Support** - Frontend + Backend em uma aplicação
- ✅ **Zero Configuração** - Deploy direto do GitHub
- ✅ **PostgreSQL Gratuito** (via addon)
- ✅ **SSL Automático** 
- ✅ **Deploy Automático** a cada push

## 🔧 Pré-requisitos

1. **Conta GitHub** (gratuita)
2. **Conta Cyclic.sh** (gratuita) - conectar com GitHub
3. **Repositório público** no GitHub

## 🚀 Passos para Deploy

### 1. Preparar Repositório

Certifique-se de estar na branch `cyclic-deploy`:

```bash
git checkout cyclic-deploy
```

### 2. Deploy no Cyclic

1. **Acesse** [cyclic.sh](https://app.cyclic.sh)
2. **Conecte** sua conta GitHub
3. **Selecione** o repositório `jtarcio-clinica`
4. **Escolha** a branch `cyclic-deploy`
5. **Click Deploy**

### 3. Configurar Variáveis de Ambiente (Opcional)

No dashboard do Cyclic, ir em **Settings → Environment**:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_NAME=EO Clínica Demo
```

### 4. Aguardar Build

O Cyclic irá:
1. Instalar dependências (`npm ci`)
2. Gerar Prisma client (`npm run db:generate`)
3. Build do frontend (`cd frontend && npm run build`)
4. Iniciar servidor (`npm start`)

## 🎯 URLs de Acesso

Após o deploy:

- **URL Principal**: `https://seu-projeto-cyclic.app`
- **API Health**: `https://seu-projeto-cyclic.app/health`
- **Login**: `https://seu-projeto-cyclic.app/auth/login`

## 🔐 Credenciais Demo

O Cyclic usa dados mock em memória para demonstração:

### Admin
- **Email**: `admin@eoclinica.com.br`
- **Senha**: `Admin123!`

### Doutor
- **Email**: `doctor@eoclinica.com.br`  
- **Senha**: `Admin123!`

### Paciente
- **Email**: `patient@eoclinica.com.br`
- **Senha**: `Admin123!`

## 📊 Recursos Utilizados

### Mock Database
- **Usuários**: 3 usuários demo (Admin, Doutor, Paciente)
- **Consultas**: 1 consulta demo
- **Storage**: Em memória (reinicia a cada deploy)

### APIs Funcionais
- ✅ `POST /api/auth/login` - Login
- ✅ `GET /api/auth/me` - Perfil usuário  
- ✅ `GET /api/appointments` - Lista consultas
- ✅ `GET /api/patients` - Lista pacientes
- ✅ `GET /api/doctors` - Lista doutores
- ✅ `GET /health` - Health check

## 🔄 Atualizações

Para atualizar o deploy:

```bash
# Fazer mudanças no código
git add .
git commit -m "🔧 update: Nova funcionalidade"
git push origin cyclic-deploy
```

O Cyclic irá automaticamente rebuildar e fazer redeploy.

## 🔧 Estrutura Técnica

### Arquivos Importantes

- `src/index-cyclic.ts` - Servidor principal do Cyclic
- `src/config/database-cyclic.ts` - Mock database
- `cyclic.json` - Configuração do Cyclic
- `frontend/out/` - Build estático do Next.js

### Fluxo de Funcionamento

1. **Cyclic recebe requisição**
2. **Servidor Fastify** analisa URL:
   - `/api/*` → Rotas da API
   - `/*` → Arquivos estáticos (React)
3. **Frontend** faz chamadas para `/api/*`
4. **Mock Database** retorna dados demo

## 💡 Para Produção Real

Para uso em produção, considere:

### 1. Database Real
```bash
# Adicionar PostgreSQL addon no Cyclic
# Atualizar DATABASE_URL nas env vars
# Usar Prisma real em vez do mock
```

### 2. Autenticação Real
```bash
# Implementar JWT tokens reais
# Adicionar hash de senhas
# Middleware de autenticação
```

### 3. Monitoramento
```bash
# Logs do Cyclic
# Health checks
# Error tracking
```

## 🐛 Troubleshooting

### Erro "Build Failed"
**Solução**: Verificar logs no dashboard do Cyclic

### Erro "Frontend não carrega"
**Solução**: Verificar se `frontend/out` foi criado no build

### Erro "API não responde"  
**Solução**: Verificar logs do servidor no Cyclic

### Dados não persistem
**Normal**: Mock database reinicia a cada deploy

## 🔗 Links Úteis

- [Cyclic.sh Documentation](https://docs.cyclic.sh/)
- [Cyclic.sh Dashboard](https://app.cyclic.sh)
- [GitHub Repository](https://github.com/josivantarcio/jtarcio-clinica)

## ⚡ Vantagens do Cyclic

- **Deploy em 2 minutos**
- **Zero configuração de infraestrutura**  
- **Perfeito para demos e testes**
- **Escalável para produção**
- **SSL e CDN inclusos**

---

**Status**: ✅ Pronto para deploy no Cyclic.sh
**Custo**: 🆓 Completamente gratuito
**Tempo de setup**: ~2 minutos