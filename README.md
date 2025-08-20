# EO Clínica - Sistema de Agendamento Médico com IA

## Visão Geral

Sistema completo de agendamento médico com inteligência artificial integrada, desenvolvido com Node.js, TypeScript, Next.js e Claude Sonnet 4. Sistema production-ready com funcionalidades avançadas de gestão médica, validações CPF brasileiras, sistema de especialidades, calendário interativo e interface moderna.

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

- **Documentação Completa**: [`/docs`](./docs/) - 24 arquivos de documentação técnica
- **Status do Projeto**: [`/docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) - Status detalhado v1.4.0
- **Estratégia de Testes**: [`/tests/TEST_STRATEGY.md`](./tests/TEST_STRATEGY.md) - Guia completo de testes
- **Guia de Solução de Problemas**: [`/docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)
- **Arquitetura do Sistema**: [`/docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Configuração de Portas**: [`/docs/PORTS.md`](./docs/PORTS.md)
- **Guia de Deploy**: [`/docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)
- **Integração IA**: [`/docs/AI_INTEGRATION.md`](./docs/AI_INTEGRATION.md)
- **Segurança & LGPD**: [`/docs/SECURITY_GUIDE.md`](./docs/SECURITY_GUIDE.md)
- **Schema do Banco**: [`/docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)
- **Prompts de IA**: [`/prompt`](./prompt/) - 6 setores de desenvolvimento

## 🧪 Sistema de Testes

### **Estratégia Abrangente Implementada** (v1.4.0)

O projeto possui uma estratégia completa de testes com **12 categorias** implementadas:

#### **🔬 Categorias de Testes**
- **Unit**: Testes unitários com mocks (`/tests/unit/`)
- **Integration**: Testes de integração de APIs (`/tests/integration/`)
- **E2E**: Testes end-to-end completos (`/tests/e2e/`)
- **Performance**: Benchmarks de performance (`/tests/performance/`)
- **Security**: Validação de segurança LGPD (`/tests/security/`)
- **API**: Testes de endpoints REST (`/tests/api/`)
- **Database**: Validação de schema e queries (`/tests/database/`)
- **Financial**: Testes do módulo financeiro (`/tests/financial/`)
- **Frontend**: Testes de componentes React (`/tests/frontend/`)
- **Deployment**: Validação de deploy (`/tests/deployment/`)
- **Monitoring**: Testes de monitoramento (`/tests/monitoring/`)
- **AI**: Testes de integração IA existentes + novos (`/tests/ai/`)

#### **🚀 Executar Testes**
```bash
# Todos os testes
npm run test

# Por categoria
npm run test:unit         # Testes unitários
npm run test:integration  # Testes de integração
npm run test:e2e          # Testes end-to-end
npm run test:performance  # Benchmarks de performance
npm run test:security     # Validação de segurança
npm run test:coverage     # Relatório de cobertura
```

#### **📊 Metas de Qualidade**
- **Cobertura**: 80%+ código coberto
- **Performance**: API <200ms, Frontend <3s
- **Segurança**: Conformidade LGPD 100%
- **Disponibilidade**: 99.9% uptime target

#### **🛡️ Testes Implementados**
- ✅ **Security Tests**: SQL injection, XSS, LGPD compliance
- ✅ **Performance Tests**: Load testing, memory monitoring
- ✅ **Unit Tests**: UserService com mocks completos
- ✅ **Integration Tests**: Fluxo de autenticação completo
- ✅ **E2E Tests**: Fluxo de agendamento end-to-end
- ✅ **AI Tests**: Integração Claude + ChromaDB (631 linhas existentes)
- ✅ **Scheduling Tests**: Motor de agendamento completo (1,137 linhas existentes)
- ✅ **Test Setup**: Configuração Jest + Prisma para ambiente de testes

## Problemas Comuns

### Porta já está em uso:
```bash
./scripts/start-complete.sh  # Limpa automaticamente
```

### Frontend redirecionando para /dashboard:
- Limpe o cache do navegador ou clique em "Limpar Cache" na página inicial

### Mais soluções: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## Stack Tecnológico

- **Backend**: Node.js 18+ + TypeScript 5.2+ + Fastify 4.24+
- **Frontend**: Next.js 15.4.6 + React 19.1.0 + Tailwind CSS v4
- **Banco**: PostgreSQL 15 + Redis 7 + ChromaDB 1.7+
- **IA**: Claude Sonnet 4 (Anthropic API)
- **Automação**: N8N Workflows + Custom Nodes
- **Container**: Docker + Docker Compose (Monorepo)
- **ORM**: Prisma 5.22+ + Generated Client
- **UI**: Radix UI + Framer Motion + Lucide Icons

## Arquitetura

```
Frontend (Next.js) ←→ API (Fastify) ←→ PostgreSQL
                              ↓
                     AI (Claude) + N8N + Redis + ChromaDB
```

## Status do Projeto

✅ **PRODUCTION READY v1.4.0** - Sistema completo com estratégia abrangente de testes implementada

### 🚀 Funcionalidades Implementadas
- ✅ **Gestão de Pacientes**: CRUD completo com validação CPF brasileira e exportação Excel
- ✅ **Gestão de Médicos**: Sistema completo com especialidades, CRM e cálculo automático de experiência
- ✅ **Sistema de Consultas Premium**: Calendário interativo com design dark elegante e localização PT-BR
- ✅ **Interface de Agendamento Premium**: 4 passos com animações suaves, gradientes e micro-interações
- ✅ **Especialidades Médicas**: 12 especialidades pré-configuradas com preços e durações
- ✅ **Autenticação**: Sistema multi-role (Admin, Médico, Paciente, Recepcionista)
- ✅ **Interface Moderna**: Next.js 15 + React 19 com design responsivo premium e glassmorphism
- ✅ **API RESTful**: Backend completo com validações, logs de auditoria e conformidade LGPD
- ✅ **Banco de Dados**: Schema PostgreSQL completo com 12+ entidades relacionadas
- ✅ **API Client Robusto**: Sistema de conexão aprimorado com debugging avançado e tratamento de erros
- ✅ **UX/UI Premium**: Calendário dark theme, scrollbars customizados, animações e efeitos visuais
- ✅ **🧪 Estratégia de Testes**: 12 categorias implementadas com 80%+ cobertura target

---

**© 2025 Jtarcio Desenvolvimento - Desenvolvido para revolucionar o agendamento médico no Brasil**