# 🚢 Configuração de Portas - EO Clínica

## 📋 Portas Padronizadas

| Serviço | Porta | URL | Descrição |
|---------|-------|-----|-----------|
| **Frontend** | `3001` | http://localhost:3001 | Interface Next.js do usuário |
| **Backend** | `3000` | http://localhost:3000 | API Fastify + Swagger Docs |
| **PostgreSQL** | `5432` | localhost:5432 | Banco de dados principal |
| **Redis** | `6379` | localhost:6379 | Cache e sessões |
| **ChromaDB** | `8000` | http://localhost:8000 | Banco vetorial para IA |
| **N8N** | `5678` | http://localhost:5678 | Automação de workflows |
| **PgAdmin** | `5050` | http://localhost:5050 | Interface de administração DB |

## 🚀 Como Iniciar

### Opção 1: Script Automático
```bash
./start-dev.sh
```

### Opção 2: Manual
```bash
# Backend (porta 3000)
npm run start &

# Frontend (porta 3001)
cd frontend && PORT=3001 npm run dev &
```

### Opção 3: Docker (apenas serviços de apoio)
```bash
# Subir apenas banco, redis, etc (sem conflitar com desenvolvimento local)
npm run docker:up
docker stop eo-clinica2_app_1 eo-clinica2_frontend_1
```

## ⚠️ Resolução de Conflitos

Se alguma porta estiver ocupada:

```bash
# Verificar o que está usando a porta
lsof -i :3000  # ou :3001

# Parar containers Docker conflitantes
docker stop eo-clinica2_app_1 eo-clinica2_frontend_1

# Ou matar processo específico
pkill -f "port.*3000"
```

## 🔧 Configurações de Ambiente

### Backend (.env)
```env
PORT=3000
```

### Frontend (.env.local)
```env
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 👤 Usuários de Teste

| Tipo | Email | Senha | Descrição |
|------|-------|-------|-----------|
| Admin | admin@eoclinica.com.br | Admin123! | Administrador completo |
| Médico | dr.silva@eoclinica.com.br | Admin123! | Portal médico |
| Recepcionista | recepcao@eoclinica.com.br | Admin123! | Atendimento |
| Paciente | paciente@example.com | Admin123! | Portal do paciente |

---

**© 2025 Jtarcio Desenvolvimento**