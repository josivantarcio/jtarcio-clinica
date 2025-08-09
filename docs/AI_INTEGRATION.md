# AI Integration Documentation

## Overview

The medical clinic scheduling system includes a comprehensive AI integration built on Claude Sonnet 4, providing intelligent conversational capabilities for appointment booking, patient support, and medical information assistance.

## Architecture

### Core Components

1. **AnthropicClient** (`src/integrations/ai/anthropic-client.ts`)
   - Claude Sonnet 4 API integration
   - Rate limiting and retry logic
   - Streaming response support
   - Token usage tracking

2. **NLPPipeline** (`src/integrations/ai/nlp-pipeline.ts`)
   - Intent classification (AGENDAR_CONSULTA, REAGENDAR_CONSULTA, etc.)
   - Entity extraction (names, dates, specialties, symptoms)
   - Context analysis and sentiment detection
   - Fallback mechanisms for offline operation

3. **ChromaDBClient** (`src/integrations/ai/chromadb-client.ts`)
   - Vector database for embeddings
   - Semantic search capabilities
   - Conversation history indexing
   - Knowledge base management

4. **ConversationContextManager** (`src/integrations/ai/conversation-context.ts`)
   - Session and context management
   - Slot filling for appointment data
   - Multi-turn conversation support
   - Redis-based persistence

5. **ConversationManager** (`src/integrations/ai/conversation-manager.ts`)
   - Main orchestration layer
   - Integrates all AI components
   - Handles streaming responses
   - Manages conversation flows

6. **MedicalKnowledgeBase** (`src/integrations/ai/knowledge-base.ts`)
   - Medical specialties database
   - FAQ management
   - Emergency protocols
   - Clinic policies

7. **PromptTemplateManager** (`src/integrations/ai/prompt-templates.ts`)
   - Dynamic prompt generation
   - Template management by intent
   - Context-aware prompting

8. **ConversationFlowHandler** (`src/integrations/ai/conversation-flows.ts`)
   - Appointment booking workflows
   - Emergency assessment protocols
   - Cancellation and rescheduling flows

## Features

### Intent Recognition
The system can detect and handle the following intents:

- `AGENDAR_CONSULTA` - Schedule new appointment
- `REAGENDAR_CONSULTA` - Reschedule existing appointment
- `CANCELAR_CONSULTA` - Cancel appointment
- `CONSULTAR_AGENDAMENTO` - Check appointment status
- `EMERGENCIA` - Medical emergency assessment
- `INFORMACOES_GERAIS` - General clinic information

### Entity Extraction
Automatically extracts structured data from natural language:

```typescript
interface ExtractedEntities {
  pessoa?: { nome?: string; nomeCompleto?: string; }
  documento?: { cpf?: string; rg?: string; }
  contato?: { telefone?: string; email?: string; }
  especialidade?: string[]
  temporal?: { data?: string; horario?: string; periodo?: string; }
  sintoma?: string[]
  urgencia?: { nivel: string; descricao?: string; }
}
```

### Conversation Management
- **Slot Filling**: Gradually collects required information
- **Context Persistence**: Maintains conversation state across sessions
- **Multi-turn Support**: Handles complex booking workflows
- **Confirmation Flows**: Verifies important information before actions

### Medical Knowledge
- **Specialty Information**: Detailed descriptions and common procedures
- **Emergency Protocols**: Automatic emergency situation detection
- **FAQ Database**: Common questions and clinic policies
- **Symptom Assessment**: Basic triage capabilities

## API Endpoints

### Chat Endpoints

#### POST `/api/v1/chat/message`
Process a single chat message.

```json
{
  "message": "Quero agendar uma consulta com cardiologista",
  "userId": "user123",
  "sessionId": "session456",
  "conversationId": "conv789"
}
```

#### POST `/api/v1/chat/stream`
Process message with streaming response (Server-Sent Events).

#### GET `/api/v1/chat/history`
Get conversation history for a session.

#### POST `/api/v1/chat/conversation`
Create a new conversation.

#### GET `/api/v1/chat/health`
Check AI system health status.

#### GET `/api/v1/chat/stats`
Get usage statistics and metrics.

### WebSocket Support
Real-time chat via WebSocket connection at `/api/v1/chat/ws`.

## Configuration

### Environment Variables

```env
# AI Integration
ANTHROPIC_API_KEY=your_claude_api_key
ANTHROPIC_API_VERSION=2023-06-01
ENABLE_AI_INTEGRATION=true

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION_NAME=clinic_conversations

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

### Rate Limits
- Regular messages: 30 per minute per user
- Streaming messages: 20 per minute per user
- Batch processing: 5 per 5 minutes per user

## Usage Examples

### Basic Chat Integration

```typescript
import { AIService } from './src/services/ai-service.js';

const aiService = new AIService(prisma, redis);
await aiService.initialize();

// Process message
const response = await aiService.processMessage({
  message: "Quero agendar uma consulta",
  userId: "user123"
});

console.log(response.data?.message);
// "Olá! Vou ajudá-lo a agendar sua consulta. Qual seu nome completo?"
```

### Streaming Response

```typescript
const streamResponse = await aiService.processMessageStreaming({
  message: "Preciso cancelar minha consulta",
  userId: "user123"
});

if (streamResponse.success && streamResponse.stream) {
  for await (const chunk of streamResponse.stream) {
    console.log(chunk.content);
    if (chunk.isComplete) break;
  }
}
```

### Frontend Integration

```javascript
// Regular chat
const response = await fetch('/api/v1/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: userInput,
    sessionId: currentSessionId
  })
});

const data = await response.json();
if (data.success) {
  displayMessage(data.data.message);
  
  if (data.data.nextSteps) {
    showSuggestions(data.data.nextSteps);
  }
}

// Streaming chat
const eventSource = new EventSource('/api/v1/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ message: userInput })
});

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  appendToMessage(chunk.content);
  
  if (chunk.isComplete) {
    eventSource.close();
  }
};
```

## Conversation Flows

### Appointment Booking Flow

1. **Intent Detection**: Identify scheduling request
2. **Patient Info Collection**: Name, phone, CPF
3. **Specialty Selection**: Choose medical specialty
4. **Time Preferences**: Collect date/time preferences
5. **Availability Check**: Query available slots
6. **Option Selection**: Present and confirm choices
7. **Final Confirmation**: Verify all details
8. **Appointment Creation**: Create in database

### Emergency Assessment Flow

1. **Symptom Collection**: Gather symptom information
2. **Urgency Evaluation**: Assess emergency level
3. **Protocol Matching**: Find relevant emergency protocols
4. **Action Guidance**: Provide immediate instructions
5. **Escalation**: Direct to appropriate medical care

## Testing

### Unit Tests
```bash
npm test tests/ai-integration.test.ts
```

### Integration Tests
```bash
npm test -- --testPathPattern=ai-integration
```

### Manual Testing
Use the provided test endpoints or Swagger documentation at `/documentation`.

## Monitoring and Metrics

### Health Checks
- **Anthropic API**: Connection and response status
- **ChromaDB**: Vector database connectivity
- **Redis**: Context storage availability
- **Overall**: Combined system health

### Metrics Tracked
- Message processing time
- Intent classification accuracy
- Token usage and costs
- Conversation completion rates
- User satisfaction indicators

### Logging
All AI interactions are logged with:
- User ID and session information
- Intent and entity extraction results
- Processing times and errors
- Token usage statistics

## Security Considerations

### Data Privacy
- **LGPD Compliance**: Personal data encryption and retention policies
- **Conversation Cleanup**: Automatic removal of old conversations
- **Sensitive Data**: Medical information handling protocols

### Rate Limiting
- Per-user message limits
- IP-based restrictions
- Abuse detection and prevention

### Authentication
- JWT token validation
- User context isolation
- Session security

## Deployment

### Docker Configuration
```yaml
services:
  clinic-api:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - CHROMA_HOST=chromadb
      - ENABLE_AI_INTEGRATION=true
  
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
```

### Production Setup
1. **API Keys**: Secure Claude API key management
2. **Vector Database**: ChromaDB production deployment
3. **Scaling**: Redis clustering for context management
4. **Monitoring**: Health checks and alerting

## Troubleshooting

### Common Issues

#### AI Service Not Initializing
- Check `ANTHROPIC_API_KEY` configuration
- Verify ChromaDB connectivity
- Review Redis connection settings

#### Poor Intent Recognition
- Check prompt templates for clarity
- Verify training data quality
- Consider fallback mechanisms

#### High Response Times
- Monitor Claude API latency
- Check ChromaDB query performance
- Optimize prompt complexity

#### Memory Usage
- Implement conversation history cleanup
- Monitor Redis memory usage
- Adjust context window sizes

### Debug Mode
Enable debug logging with `LOG_LEVEL=debug` to see detailed AI processing steps.

### Performance Optimization
- Use streaming for better UX
- Implement caching for frequent queries
- Optimize ChromaDB collection sizes
- Monitor and adjust rate limits

## Future Enhancements

### Planned Features
- **Voice Integration**: Speech-to-text and text-to-speech
- **Multi-language Support**: Portuguese and English
- **Advanced Analytics**: Conversation analysis and insights
- **Integration APIs**: Third-party system connections
- **Mobile SDK**: Native mobile app integration

### Scalability Improvements
- **Load Balancing**: Multiple AI service instances
- **Caching Layer**: Response and context caching
- **Database Optimization**: Query performance improvements
- **Monitoring**: Advanced metrics and alerting

---

For additional support or questions about the AI integration, please refer to the main project documentation or contact the development team.