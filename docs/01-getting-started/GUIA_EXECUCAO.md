# 🚀 EO Clínica - Guia de Execução Completa

## ⚡ Início Rápido (Tudo Funcionando)

### 1. Backend + Banco de Dados (Automático)
```bash
# Na raiz do projeto
./scripts/dev-setup.sh
```
✅ **Resultado**: Backend, PostgreSQL, Redis, ChromaDB, N8N e PgAdmin rodando automaticamente

### 2. Frontend (Manual)
```bash
# Em outro terminal
cd frontend
./start.sh
```
✅ **Resultado**: Interface web rodando em http://localhost:3001

## 🌐 Acesso aos Serviços

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **🎨 Frontend** | http://localhost:3001 | Ver usuários abaixo |
| **🔧 API Backend** | http://localhost:3000 | - |
| **📚 API Docs** | http://localhost:3000/documentation | - |
| **🤖 N8N Automações** | http://localhost:5678 | admin/admin123 |
| **💾 PgAdmin** | http://localhost:5050 | admin@clinic.com/admin123 |

## 👥 Usuários de Teste

| Perfil | Email | Senha | Acesso |
|--------|-------|-------|--------|
| **👑 Admin** | admin@eoclinica.com.br | Admin123! | Gestão completa |
| **👨‍⚕️ Médico** | dr.silva@eoclinica.com.br | Admin123! | Portal médico |
| **👩‍💼 Recepcionista** | recepcao@eoclinica.com.br | Admin123! | Front desk |
| **🤒 Paciente** | paciente@example.com | Admin123! | Portal paciente |

## 🎯 Fluxo de Teste

### 1. Acesse o Frontend
- Abra: http://localhost:3001
- **Landing Page** → Visão geral do sistema

### 2. Faça Login
- Clique em "Entrar" 
- Use qualquer usuário da tabela acima
- **Dashboard personalizado** por tipo de usuário

### 3. Explore as Funcionalidades

#### Como Admin 👑
- Dashboard com analytics
- Gestão de usuários
- Configurações do sistema
- Relatórios completos

#### Como Médico 👨‍⚕️
- Agenda pessoal
- Lista de pacientes
- Prontuários eletrônicos
- Chat com pacientes

#### Como Paciente 🤒
- Agendar consultas
- Histórico médico
- Chat com IA
- Comunicação com médicos

#### Como Recepcionista 👩‍💼
- Gestão de agendamentos
- Atendimento aos pacientes
- Relatórios operacionais

## 🔧 Desenvolvimento

### Parar os Serviços
```bash
# Para o frontend
Ctrl+C no terminal do frontend

# Para o backend e demais serviços
docker-compose down
```

### Logs e Debug
```bash
# Ver logs do backend
docker-compose logs app

# Ver logs do PostgreSQL
docker-compose logs postgres

# Ver logs do N8N
docker-compose logs n8n
```

### Reset Completo
```bash
# Limpar tudo e recomeçar
docker-compose down --volumes
./scripts/dev-setup.sh
```

## 📱 Recursos Principais

### ✨ Sistema de Agendamento
- Calendário interativo
- Disponibilidade inteligente
- Confirmações automáticas
- Lembretes por SMS/Email

### 🤖 IA Integrada
- Chat assistente para pacientes
- Análise de sintomas
- Sugestões de especialidades
- Automação de processos

### 📊 Analytics e Relatórios
- Métricas em tempo real
- Relatórios customizáveis
- Dashboard executivo
- KPIs médicos

### 🔒 Segurança e LGPD
- Criptografia de dados
- Auditoria completa
- Consentimento de dados
- Backup automático

## 🆘 Solução de Problemas

### Problemas de Porta
```bash
# Se as portas estiverem ocupadas
sudo systemctl stop postgresql redis-server
./scripts/dev-setup.sh
```

### Frontend não Carrega
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Banco de Dados
```bash
# Regenerar schema
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 🎉 Pronto para Usar!

O sistema **EO Clínica** está completo e funcional com:
- ✅ Backend robusto com API RESTful
- ✅ Frontend moderno e responsivo
- ✅ Banco de dados médico completo
- ✅ Automações N8N
- ✅ Chat com IA
- ✅ Conformidade LGPD
- ✅ Multi-tenant ready

**Comece explorando em**: http://localhost:3001 🚀
