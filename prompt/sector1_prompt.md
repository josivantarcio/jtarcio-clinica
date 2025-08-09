# PROMPT SETOR 1: ARQUITETURA E SETUP INICIAL
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO DO PROJETO
Você é um engenheiro de software sênior especializado em sistemas de saúde, IA generativa e automação. Estou desenvolvendo um sistema completo de agendamento de clínicas médicas que utiliza IA generativa (Claude Sonnet 4) para conversas naturais com pacientes e automação completa via N8N workflows.

### OBJETIVO ESPECÍFICO DESTE SETOR
Criar a arquitetura base do sistema, definindo tecnologias, estruturas de banco de dados, APIs essenciais e configuração inicial do projeto.

### REQUISITOS TÉCNICOS
- **Backend**: Node.js com TypeScript + Express/Fastify
- **Banco Principal**: PostgreSQL com Prisma ORM
- **Banco Vetorial**: Chroma ou Pinecone para embeddings
- **Cache**: Redis para sessões e cache
- **IA**: Integração com Claude Sonnet 4 API
- **Automação**: N8N workflows
- **Deploy**: Docker containers

### ESCOPO DESTE SETOR

#### 1. ARQUITETURA DO SISTEMA
- Definir estrutura de pastas e organização do projeto
- Criar diagrama de arquitetura (mermaid)
- Definir patterns de design (Repository, Service, Controller)
- Estabelecer comunicação entre microserviços

#### 2. CONFIGURAÇÃO DE BANCO DE DADOS
- Schema do PostgreSQL para:
  - Usuários (pacientes, médicos, admins)
  - Agendamentos e disponibilidade
  - Especialidades médicas e profissionais
  - Histórico de conversas com IA
  - Audit logs para LGPD
- Configuração do banco vetorial para embeddings
- Scripts de migração e seed inicial

#### 3. SETUP INICIAL DO PROJETO
- Package.json com todas as dependências
- Configuração do TypeScript
- ESLint e Prettier
- Docker e docker-compose
- Variáveis de ambiente (.env template)
- Scripts de desenvolvimento e build

#### 4. ESTRUTURA DE DADOS ESPECÍFICA

**Especialidades Médicas a considerar:**
- Clínica Geral, Cardiologia, Dermatologia
- Ginecologia, Pediatria, Ortopedia
- Oftalmologia, Neurologia, Psiquiatria
- Endocrinologia, Urologia, Otorrinolaringologia

**Regras de Negócio Base:**
- Consulta padrão: 30min (Clínica Geral) a 60min (especialidades)
- Cancelamento: mínimo 24h de antecedência
- Reagendamento: até 2x por consulta
- Antecedência mínima: 2h para agendamento
- Horário funcionamento: 7h às 19h (seg-sex), 8h às 14h (sáb)

#### 5. INTEGRAÇÕES PREPARADAS
- Estrutura para Google Calendar API
- Preparação para WhatsApp Business API
- Base para sistema de notificações
- Interface com N8N webhooks

### TAREFAS ESPECÍFICAS

1. **Crie a estrutura completa de pastas do projeto**
2. **Desenvolva o schema completo do banco PostgreSQL**
3. **Configure o projeto Node.js + TypeScript**
4. **Implemente as entidades base com Prisma**
5. **Crie os DTOs e interfaces TypeScript**
6. **Configure Docker e docker-compose**
7. **Implemente validação de dados com Zod**
8. **Configure logging estruturado**
9. **Prepare endpoints base da API REST**
10. **Documente a arquitetura com diagramas**

### DETALHES IMPORTANTES
- Todas as consultas devem ter rastreabilidade completa
- Dados sensíveis devem ser criptografados
- Implementar soft delete para auditoria
- Preparar para multi-tenancy (múltiplas clínicas)
- Considerar timezone handling (Brasil)
- Implementar rate limiting desde o início

### OUTPUT ESPERADO
- Estrutura completa de projeto funcional
- Banco de dados configurado e rodando
- APIs base funcionais
- Docker environment funcionando
- Documentação da arquitetura
- Scripts de desenvolvimento prontos

### PRÓXIMO SETOR
Após completar este setor, seguiremos para o **Setor 2: Integração com IA e Processamento de Linguagem Natural**, onde implementaremos a comunicação com Claude Sonnet 4 e todo o processamento de conversas.

---

**IMPORTANTE**: Implemente tudo com boas práticas, clean architecture, e pensando em escalabilidade. O sistema deve estar preparado para crescer e se integrar facilmente com os próximos setores.