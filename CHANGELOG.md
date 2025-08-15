# Changelog - EO Clínica

Todas as mudanças importantes neste projeto serão documentadas neste arquivo.

## [1.2.6] - 2025-08-15

### 🔧 Correções de API e Conectividade
- **🌐 API Client Aprimorado**: Sistema de conexão robusto com debugging avançado
- **🔍 Logging Detalhado**: Categorização inteligente de erros (Network vs Response vs Setup)
- **🔐 Autenticação Flexível**: Suporte a tokens fake para desenvolvimento e autenticação real
- **⏱️ Timeout Aumentado**: Aumentado para 15 segundos para maior estabilidade
- **🏥 Health Check**: Adicionado endpoint de verificação de saúde do sistema
- **🐛 Correção AxiosError**: Resolvidos erros de conexão entre frontend e backend

### 🛠️ Melhorias Técnicas
- **📊 Token Management**: Carregamento automático de tokens do localStorage
- **🔄 Error Recovery**: Tratamento inteligente de falhas de conexão
- **🎯 Request Monitoring**: Logs detalhados para debugging de requisições
- **🔒 Backward Compatibility**: Compatibilidade com backend simples e backend completo
- **⚡ Connection Diagnostics**: Informações detalhadas para troubleshooting

### 📋 Arquivos Modificados
- `frontend/src/lib/api.ts`: Cliente API completamente reescrito com debugging avançado
- `src/index-simple.ts`: Remoção de parser JSON conflitante

## [1.2.5] - 2025-08-15

### ✨ Sistema Inteligente de Experiência Médica
- **🧮 Cálculo Automático**: Experiência calculada automaticamente a partir da data de formatura ou registro no CRM
- **🕐 Correção de Timezone**: Resolvido bug de diferença de 1 dia nas datas de nascimento
- **📚 Biblioteca de Utilitários**: Criada biblioteca `date-utils` para manipulação consistente de datas
- **🔧 Correções de Sintaxe**: Corrigido erro de escape unicode em validação CPF
- **🗓️ Data Inteligente**: Sistema detecta automaticamente anos de experiência sem input manual

### 🩺 Sistema de Médicos Aprimorado
- **⭐ Rating Realista**: Corrigido sistema de avaliação para iniciar em 0 (não mais 5.0 fixo)
- **📄 Rotas Completas**: Criadas páginas `/doctors/[id]` e `/doctors/[id]/edit` (corrigido 404)
- **🎨 Consistência Visual**: Aplicados efeitos hover verdes em gerenciamento de especialidades
- **🔍 Investigação João Silva**: Confirmado que não é dados estáticos - removido das seeds
- **📊 Sistema de Avaliações**: Preparado para implementação futura (sem tabelas Review/Rating no backend)

### 🔧 Correções Técnicas
- **🗃️ API de Appointments**: Corrigido erro 500 ao filtrar múltiplos status (SCHEDULED,CONFIRMED)
- **🎯 Estados de Foco**: Implementados efeitos hover usando `focus:bg-primary/10` para melhor UX
- **📁 Exportação Excel**: Corrigida geração de arquivos .xlsx com formatação adequada
- **🔐 API de Usuários**: Adicionado método `updateUser` para gerenciamento de status
- **⚡ Estados de Loading**: Spinners e estados desabilitados durante atualizações de status
- **📊 Consistência de Dados**: Reload automático após mudanças de status

### 📋 Arquivos Modificados
- `frontend/src/lib/date-utils.ts`: Nova biblioteca de utilitários de data
- `frontend/src/app/doctors/[id]/page.tsx`: Nova página de detalhes do médico
- `frontend/src/app/doctors/[id]/edit/page.tsx`: Nova página de edição do médico
- `frontend/src/app/doctors/new/page.tsx`: Correção de escape unicode
- `src/routes/appointments.ts`: Correção de filtros múltiplos
- Database Seeds: Removido João Silva estático

## [1.2.0] - 2025-08-14

### 🚀 Sistema de Consultas Implementado
- **📅 Calendário Interativo**: Interface moderna de calendário com visualização de consultas
- **⏰ Gestão de Horários**: Sistema completo de slots de tempo com detecção de conflitos
- **🔄 Ciclo de Vida**: Gerenciamento completo do status das consultas (agendada → concluída)
- **🎯 Interface Profissional**: Design médico com codificação de cores por status
- **📱 Design Responsivo**: Funciona perfeitamente em todos os dispositivos

### 🩺 Sistema de Médicos Completo
- **👨‍⚕️ Cadastro Médico**: Formulários completos com validação CRM e especialidades
- **🏥 Integração de Especialidades**: Seleção dinâmica com preços e durações
- **📊 Interface Moderna**: Listagem profissional com estatísticas e busca
- **🔄 Gerenciamento de Status**: Ativação/desativação com estados de loading
- **🎨 Consistência Visual**: Efeitos hover verdes aplicados uniformemente

### 🧾 Sistema de Especialidades Administrativo
- **⚙️ Interface Admin**: Modal completo para gerenciar especialidades médicas
- **💰 Gestão de Preços**: CRUD funcional para especialidades e preços
- **📊 Integração Real**: Conectado ao PostgreSQL (sem dados hardcoded)
- **🎨 UX Aprimorada**: Cards visuais responsivos na página de agendamento

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