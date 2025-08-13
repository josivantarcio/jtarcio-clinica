# EO Clínica - Sistema de Agendamento Médico com IA

## Visão Geral

Sistema completo de agendamento médico com inteligência artificial integrada, desenvolvido com Node.js, TypeScript, Next.js e Claude Sonnet 4.

## Início Rápido

### Executar o Sistema Completo
```bash
# Backend + Banco de Dados (Automático)
./scripts/dev-setup.sh

# Frontend (Em outro terminal)
cd frontend && ./start.sh
```

### Acesso aos Serviços
- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/documentation
- **N8N**: http://localhost:5678 (admin/admin123)
- **PgAdmin**: http://localhost:5050 (admin@clinic.com/admin123)

## Usuários Padrão

**Senha para todos**: `Admin123!`

- **Admin**: admin@eoclinica.com.br
- **Médico**: dr.silva@eoclinica.com.br
- **Recepcionista**: recepcao@eoclinica.com.br
- **Paciente**: paciente@example.com

## Como Iniciar

### Opção 1: Script Automático (Recomendado)
```bash
./scripts/start-complete.sh
```

### Opção 2: Manual
```bash
# Backend (porta 3000)
npm run start &

# Frontend (porta 3001) 
cd frontend && PORT=3001 npm run dev &
```

### Opção 3: Com Docker
```bash
npm run docker:up
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Documentação

- **Documentação Completa**: [`/docs`](./docs/)
- **Guia de Solução de Problemas**: [`/docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)
- **Configuração de Portas**: [`/docs/PORTS.md`](./docs/PORTS.md)
- **Prompts de IA**: [`/prompt`](./prompt/)

## Problemas Comuns

### Porta já está em uso:
```bash
./scripts/start-complete.sh  # Limpa automaticamente
```

### Frontend redirecionando para /dashboard:
- Limpe o cache do navegador ou clique em "Limpar Cache" na página inicial

### Mais soluções: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## Stack Tecnológico

- **Backend**: Node.js + TypeScript + Fastify
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Banco**: PostgreSQL + Redis + ChromaDB
- **IA**: Claude Sonnet 4
- **Automação**: N8N Workflows
- **Container**: Docker + Docker Compose

## Arquitetura

```
Frontend (Next.js) ←→ API (Fastify) ←→ PostgreSQL
                              ↓
                     AI (Claude) + N8N + Redis + ChromaDB
```

## Status do Projeto

COMPLETED **100% Funcional** - Sistema completo de produção pronto

---

**© 2025 Jtarcio Desenvolvimento - Desenvolvido para revolucionar o agendamento médico no Brasil**