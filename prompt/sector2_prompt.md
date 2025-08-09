# PROMPT SETOR 2: INTEGRAÇÃO COM IA E PROCESSAMENTO DE LINGUAGEM NATURAL
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO CONTINUADO
Este é o segundo setor do desenvolvimento. A arquitetura base já está implementada. Agora focaremos na integração com Claude Sonnet 4, processamento de linguagem natural, sistema de embeddings e toda a inteligência conversacional do sistema.

### OBJETIVO ESPECÍFICO DESTE SETOR
Implementar toda a camada de inteligência artificial, incluindo processamento de conversas, extração de entidades, classificação de intenções e sistema de embeddings para busca semântica.

### ESCOPO DESTE SETOR

#### 1. INTEGRAÇÃO CLAUDE SONNET 4
- Cliente TypeScript para Anthropic API
- Sistema de retry e fallback
- Rate limiting inteligente
- Context management para conversas longas
- Template system para prompts
- Streaming responses para UX otimizada

#### 2. PROCESSAMENTO DE LINGUAGEM NATURAL
- **Intent Classification**:
  - `AGENDAR_CONSULTA`
  - `REAGENDAR_CONSULTA`
  - `CANCELAR_CONSULTA`
  - `CONSULTAR_AGENDAMENTO`
  - `EMERGENCIA`
  - `INFORMACOES_GERAIS`

- **Entity Extraction**:
  - Especialidades médicas
  - Datas e horários (processamento de linguagem natural)
  - Dados pessoais (nome, CPF, telefone)
  - Sintomas e urgência
  - Preferências (manhã/tarde, médico específico)

#### 3. SISTEMA DE EMBEDDINGS
- Configuração do banco vetorial (Chroma/Pinecone)
- Indexação de:
  - Histórico de conversas
  - Base de conhecimento médico
  - FAQs da clínica
  - Perfis de comportamento dos pacientes
- Busca semântica para contexto relevante

#### 4. CONVERSATIONAL AI ENGINE

**Features Principais:**
- Context-aware responses
- Multi-turn conversation handling
- Slot filling para agendamentos
- Confirmation flows
- Error handling e recovery
- Escalation para humanos

**Fluxos Conversacionais:**
```
Usuário: "Preciso marcar uma consulta com cardiologista"
IA: Extrai → Intent: AGENDAR, Entity: Cardiologia
IA: "Claro! Para agendar com cardiologia, preciso de alguns dados..."

Usuário: "Pode ser na próxima semana, de manhã"
IA: Extrai → Temporal: próxima semana + manhã
IA: Verifica disponibilidade → Apresenta opções
```

#### 5. KNOWLEDGE BASE
- Base médica com especialidades e procedimentos
- FAQs automatizadas
- Protocolos de emergência
- Informações sobre convênios
- Políticas da clínica

### COMPONENTES TÉCNICOS A IMPLEMENTAR

#### 1. AnthropicClient Service
```typescript
interface ConversationContext {
  userId: string;
  sessionId: string;
  conversationHistory: Message[];
  extractedEntities: EntityMap;
  currentIntent: Intent;
  slotsFilled: SlotMap;
}
```

#### 2. NLP Pipeline
- Preprocessamento de texto
- Entity recognition
- Intent classification
- Sentiment analysis
- Context extraction

#### 3. Embedding Service
- Document indexing
- Semantic search
- Similarity matching
- Context retrieval

#### 4. Conversation Manager
- Session management
- Context persistence
- Flow orchestration
- Response generation

### INTEGRAÇÕES COM SETOR 1
- Utilizar as entidades já criadas (User, Appointment, etc.)
- Conectar com o sistema de agendamentos
- Integrar com audit logs
- Usar cache Redis para sessões

### TAREFAS ESPECÍFICAS

1. **Configure o cliente Anthropic API**
2. **Implemente o sistema de prompts e templates**
3. **Crie o pipeline de NLP (Intent + Entity)**
4. **Configure o banco vetorial e embeddings**
5. **Desenvolva o Conversation Manager**
6. **Implemente context management**
7. **Crie os fluxos conversacionais principais**
8. **Configure sistema de fallback**
9. **Implemente rate limiting e retry logic**
10. **Desenvolva testes para IA**

### PROMPTS ESPECÍFICOS PARA CLAUDE

#### Prompt Base para Agendamento:
```
Você é um assistente especializado em agendamento médico da Clínica [NOME]. 
Seu objetivo é ajudar pacientes a agendar consultas de forma eficiente e amigável.

ESPECIALIDADES DISPONÍVEIS: {especialidades}
REGRAS DE AGENDAMENTO: {regras}
HORÁRIOS DISPONÍVEIS: {disponibilidade}

INSTRUÇÕES:
1. Seja sempre cordial e profissional
2. Colete informações necessárias gradualmente
3. Confirme todos os dados antes de agendar
4. Em caso de emergência, direcione adequadamente
5. Ofereça alternativas quando não há disponibilidade

DADOS NECESSÁRIOS PARA AGENDAMENTO:
- Nome completo
- CPF ou RG
- Telefone
- Especialidade desejada
- Preferência de data/horário
- Convênio (se houver)

Conversação atual:
{conversation_history}

Responda de forma natural e útil:
```

#### Prompt para Entity Extraction:
```
Extraia as seguintes entidades do texto:
- PESSOA: nome completo
- DOCUMENTO: CPF, RG
- CONTATO: telefone, email
- ESPECIALIDADE: área médica
- TEMPORAL: datas, horários, períodos
- SINTOMA: descrição de problemas
- URGENCIA: nível de emergência

Texto: {user_message}
Retorne JSON estruturado.
```

### CONFIGURAÇÕES ESPECÍFICAS

#### Rate Limiting:
- 100 requests/minute por usuário
- 1000 requests/hour por IP
- Burst até 20 requests

#### Context Window:
- Manter últimas 10 mensagens
- Limpar contexto após 30min inatividade
- Persistir dados importantes

#### Error Handling:
- API failures → fallback responses
- Parse errors → solicitar clarificação
- Context loss → recuperar estado

### MÉTRICAS E MONITORING
- Response time da IA
- Accuracy de intent classification
- Success rate de agendamentos
- User satisfaction scores
- Token usage tracking

### OUTPUT ESPERADO
- Sistema de IA conversacional funcionando
- Pipeline de NLP operacional
- Embeddings configurados
- Fluxos de agendamento automatizados
- Testes de conversação passando
- Métricas implementadas

### INTEGRAÇÃO COM N8N (Preparação)
- Webhooks para triggers de IA
- Estrutura de dados para workflows
- Event emission para automações
- API endpoints para N8N consumer

### PRÓXIMO SETOR
Após completar este setor, seguiremos para o **Setor 3: Sistema de Agendamento Core e Business Logic**, onde implementaremos toda a lógica de negócio, validações, conflitos e otimizações de agenda.

---

**IMPORTANTE**: Implemente com foco na experiência conversacional natural. O usuário deve sentir que está falando com um assistente inteligente que realmente entende suas necessidades médicas.