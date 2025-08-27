# EO Clínica - AI Integration Development Prompt

## Contexto do Projeto

O EO Clínica é um sistema SaaS de gestão médica completo (versão 1.4.0) com módulo financeiro implementado, que precisa de integração com IA via WhatsApp para automatizar agendamentos e atendimento aos pacientes.

## Arquitetura Atual

- **Backend**: Node.js + TypeScript + Fastify + PostgreSQL + Prisma
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4
- **Infraestrutura**: Docker Compose com Redis, ChromaDB, N8N, PgAdmin
- **Status**: Sistema 100% funcional em produção

## Objetivo da Integração

Criar um assistente de IA educado e inteligente que:

### Funcionalidades Core
1. **Atendimento WhatsApp**: Integração N8N + WAHA + Gemini Pro
2. **Agendamentos Automáticos**: Análise de sintomas → especialidade → disponibilidade
3. **Reconhecimento de Voz**: Transcrição e processamento de áudios
4. **Lembretes Inteligentes**: Notificações automáticas de consultas
5. **Continuidade Conversacional**: Compreensão de mensagens fragmentadas

### Características da IA

#### Personalidade e Comportamento
- **Educada e Profissional**: Linguagem médica adequada, sem gírias
- **Tempo de Resposta**: 2-3 segundos de delay para parecer natural
- **Respostas Concisas**: Máximo 2-3 frases por resposta
- **Segurança de Dados**: NUNCA divulgar informações financeiras ou de outros pacientes
- **Persistência**: Mesmo com insistência, manter limites de privacidade

#### Inteligência Conversacional
- **Contextual**: Lembrar do histórico da conversa atual
- **Fragmentação**: Aguardar mensagens complementares antes de responder
- **Aprendizado**: Usar documentação do sistema para respostas precisas
- **Escalação**: Transferir para humano quando necessário

## Especificações Técnicas

### Stack de Integração
```
N8N (Workflows) → WAHA (WhatsApp) → Gemini Pro (IA) → EO Clínica API
```

### APIs Disponíveis no Sistema
- `/api/v1/appointments` - Agendamentos completos
- `/api/v1/users` - Gestão de pacientes e médicos
- `/api/v1/specialties` - Especialidades médicas
- `/api/v1/availability` - Disponibilidade de médicos
- `/api/v1/financial/*` - Módulo financeiro (8 endpoints)

### Configurações Ambiente
- **Gemini Pro API**: Configurada via `.env`
- **Database**: PostgreSQL com schema completo
- **Cache**: Redis para sessões
- **Vectors**: ChromaDB para embeddings

## Arquivos de Referência

Consulte a pasta `/docs` para documentação específica:
- APIs necessárias para integração
- Fluxos de trabalho N8N
- Especificações WAHA
- Padrões de resposta da IA

## Estrutura de Desenvolvimento

### Fase 1: Infraestrutura Base
1. **N8N Setup**: Configurar workflows básicos
2. **WAHA Integration**: Conectar WhatsApp Business API
3. **Gemini Configuration**: Setup da IA com prompts específicos
4. **Database Schema**: Tabelas para conversas e contexto

### Fase 2: IA Core
1. **Prompt Engineering**: Personalidade e regras de negócio
2. **Voice Recognition**: Integração de transcrição
3. **Context Management**: Histórico e continuidade
4. **Response Filtering**: Segurança e privacidade

### Fase 3: Automações
1. **Appointment Booking**: Fluxo completo de agendamento
2. **Reminder System**: Notificações automáticas
3. **Escalation Logic**: Transferência para humano
4. **Analytics Integration**: Métricas de conversação

### Fase 4: Testing & Refinement
1. **Unit Tests**: Pasta `/tests` configurada
2. **Integration Tests**: Fluxos end-to-end
3. **User Acceptance**: Testes com cenários reais
4. **Performance Optimization**: Latência e throughput

## Diretrizes de Implementação

### Segurança e Compliance
- **LGPD**: Auditoria completa implementada
- **Encryption**: Dados sensíveis criptografados
- **Rate Limiting**: Proteção contra spam
- **Authentication**: JWT com roles definidos

### Qualidade de Código
- **TypeScript Strict**: Tipagem rigorosa
- **ESLint/Prettier**: Padrões de código
- **Error Handling**: Tratamento abrangente
- **Logging**: Winston com rotação diária

### Performance
- **Caching Strategy**: Redis para respostas frequentes
- **Database Optimization**: Queries eficientes
- **Response Time**: Meta de <3 segundos
- **Concurrent Users**: Suporte a múltiplas conversas

## Entregáveis Esperados

1. **Workflows N8N**: Configurações exportáveis
2. **API Endpoints**: Novos endpoints para IA
3. **Database Migrations**: Tabelas de conversação
4. **Frontend Components**: Interface de monitoramento
5. **Documentation**: Guias de configuração e uso
6. **Test Suite**: Cobertura mínima de 80%

## Considerações Especiais

### Experiência do Usuário
- **Typing Indicators**: Mostrar que IA está "digitando"
- **Quick Replies**: Botões para respostas rápidas
- **Rich Media**: Suporte a imagens e documentos
- **Fallback Messages**: Quando IA não compreende

### Monitoramento e Analytics
- **Conversation Metrics**: Taxa de resolução, satisfação
- **System Health**: Performance dos componentes
- **Error Tracking**: Logs de falhas e recuperação
- **Usage Analytics**: Padrões de uso e otimização

## Instruções para Claude Code

Como especialista em Engenharia de Software, siga esta abordagem metodológica:

1. **Análise Completa**: Primeiro, leia toda a documentação em `/docs`
2. **Planejamento Detalhado**: Crie roadmap técnico antes de codificar
3. **Implementação Incremental**: Desenvolva por fases, testando cada etapa
4. **Code Review**: Mantenha padrões de qualidade do projeto existente
5. **Documentação Contínua**: Atualize docs durante desenvolvimento
6. **Testing First**: Implemente testes antes das funcionalidades
7. **Security Awareness**: Considere aspectos de segurança em cada decisão

### Metodologia de Trabalho
- **Sem Pressa**: Qualidade sobre velocidade
- **Pensamento Crítico**: Questione decisões arquiteturais
- **Colaboração**: Use issues/PRs para discussão técnica
- **Iteração**: Refinamento contínuo baseado em feedback

## Status Atual do Sistema

O EO Clínica está 100% funcional com:
- ✅ Gestão completa de pacientes e médicos
- ✅ Sistema de agendamentos com calendário
- ✅ Módulo financeiro completo (v1.4.0)
- ✅ Dashboard admin com 4 abas funcionais
- ✅ Analytics em tempo real
- ✅ Compliance LGPD
- ✅ APIs RESTful completas

A integração de IA será o próximo grande marco do projeto.

---

**Developed with ❤️ for EO Clínica v1.4.0+AI**