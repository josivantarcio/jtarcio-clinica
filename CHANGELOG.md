# Changelog - EO Clínica

Todas as mudanças importantes neste projeto serão documentadas neste arquivo.

## [1.1.1] - 2025-08-14

### 🐛 Corrigido
- **Página de Pacientes**: Removidos dados hardcoded (endereço "São Paulo, SP", telefone "(11)99999-9999")
- **API de Usuários**: Implementada API real no backend substituindo endpoints 501 NOT_IMPLEMENTED
- **Erro 404 Editar Paciente**: Criada rota `/patients/[id]/edit` para edição de pacientes
- **Ícone Detalhes**: Botão "Ver detalhes" agora redireciona para página de visualização do paciente
- **Dependência sonner**: Instalada dependência para toast notifications

### ✨ Adicionado
- **UserService**: Serviço completo para operações CRUD de usuários
- **Página de Edição**: Interface completa para editar dados dos pacientes
- **Página de Detalhes**: Visualização detalhada dos pacientes com abas (Consultas, Informações Médicas, Histórico)
- **Dados Reais**: Integração com PostgreSQL via Prisma para dados reais dos pacientes
- **Toast Notifications**: Sistema de notificações com Sonner

### 🔧 Melhorado
- **API Backend**: Endpoints funcionais em `/api/v1/users` com filtros e paginação
- **Dados dos Pacientes**: Cálculo real de estatísticas (consultas, última consulta)
- **Navegação**: Fluxo completo entre listagem → detalhes → edição de pacientes
- **UX**: Melhor feedback visual com toasts para ações do usuário

### 📋 Arquivos Modificados
- `src/services/user.service.ts`: Novo serviço de usuários
- `src/routes/users.ts`: Endpoints implementados
- `frontend/src/app/patients/page.tsx`: Dados reais da API
- `frontend/src/app/patients/[id]/page.tsx`: Nova página de detalhes
- `frontend/src/app/patients/[id]/edit/page.tsx`: Nova página de edição
- `frontend/src/app/layout.tsx`: Toaster do Sonner
- `frontend/package.json`: Dependência sonner adicionada

## [1.0.2] - 2025-08-11 ### Adicionado
- **Componente Select UI**: Criado componente Select completo com Radix UI para formulários
- **Script de correção de lint**: Adicionado `lint-fix.sh` para automação de correções
- **Script de desabilitação do Redis**: Criado `disable-local-redis.sh` para resolver conflitos permanentes
- **Configuração ESLint aprimorada**: Regras customizadas para permitir variáveis com underscore ### Corrigido
- **Conflito Redis**: Docker Redis agora usa porta 6380, eliminando conflito com Redis local
- **Frontend não carregava**: Resolvido build lento do Docker, agora usando desenvolvimento híbrido
- **Problemas de lint**: Corrigidos 150+ warnings de ESLint - Imports não utilizados renomeados com prefixo `_` - Variáveis de catch renomeadas para `_error` - Configuração ESLint atualizada para TypeScript 5.x
- **Componente Select faltando**: Criado componente UI Select para página de pacientes ### Melhorado
- **Performance do frontend**: Remoção de lockfile duplicado, compilação mais rápida
- **Qualidade do código**: Redução significativa de warnings ESLint
- **Arquitetura híbrida**: Docker para infraestrutura + Local para frontend = melhor DX
- **Documentação atualizada**: README, TROUBLESHOOTING e PORTS atualizados ### Arquivos Modificados
- `docker-compose.yml`: Redis porta 6380
- `.env` e `.env.example`: URLs atualizadas
- `frontend/eslint.config.mjs`: Regras customizadas
- `frontend/src/components/ui/select.tsx`: Novo componente
- Múltiplos arquivos: Correções de lint ### Performance
- **Build do frontend**: Otimizado com `.dockerignore` melhorado
- **Desenvolvimento**: Frontend local = hot reload mais rápido
- **Docker**: Apenas infraestrutura, startup mais rápido ### Testado e Verificado
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Docker Services: Todos funcionando
- Redis: Porta 6380 sem conflitos
- Lint: Significativa redução de warnings ## [1.0.1] - 2025-08-09 ### Sistema Base
- Sistema completo de clínica médica implementado
- Frontend Next.js 15 + React 19
- Backend Node.js + TypeScript + Fastify
- Banco PostgreSQL + Redis + ChromaDB
- Integração Claude Sonnet 4
- N8N workflows
- LGPD compliance ### Funcionalidades Implementadas
- Dashboard com métricas
- Gestão de pacientes e médicos
- Sistema de agendamentos
- Calendário médico
- Chat com IA
- Relatórios e analytics
- Sistema de configurações
- Autenticação completa ## [1.0.0] - 2025-08-08 ### Release Inicial
- Arquitetura base do sistema
- Configuração do ambiente
- Docker setup completo
- Documentação inicial --- ## Tipos de Mudanças
- **Adicionado**: Para novas funcionalidades
- **Corrigido**: Para correção de bugs
- **Melhorado**: Para melhorias em funcionalidades existentes
- **Removido**: Para funcionalidades removidas
- **Depreciado**: Para funcionalidades que serão removidas
- **Segurança**: Para correções relacionadas à segurança
- **Performance**: Para melhorias de performance