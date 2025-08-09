# PROMPT SETOR 5: FRONTEND, UX/UI E INTERFACE DO USUÁRIO
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO CONTINUADO
Este é o quinto setor. Backend, IA, sistema core e automação N8N já estão implementados. Agora focaremos na criação de todas as interfaces de usuário: aplicação web responsiva, dashboard administrativo, interface de chat com IA e experiência mobile-first.

### OBJETIVO ESPECÍFICO DESTE SETOR
Desenvolver interfaces modernas, intuitivas e acessíveis para todos os usuários do sistema: pacientes, médicos, recepcionistas e administradores, com foco em UX excepcional e design system consistente.

### ESCOPO DESTE SETOR

#### 1. APLICAÇÃO PRINCIPAL (PWA)
- **Interface do Paciente**: Agendamento, histórico, perfil
- **Chat Interface**: Conversa natural com IA
- **Dashboard Médico**: Agenda, pacientes, relatórios  
- **Painel Administrativo**: Gestão completa da clínica
- **Mobile App**: PWA com funcionalidades nativas

#### 2. SISTEMA DE DESIGN
- **Design System**: Componentes reutilizáveis
- **Theme Provider**: Temas claro/escuro + acessibilidade
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Suporte multi-idioma

#### 3. EXPERIÊNCIA CONVERSACIONAL
- **Chat Interface**: Interface de conversa moderna
- **Voice Interface**: Integração com Web Speech API
- **Real-time**: WebSocket para atualizações ao vivo
- **Offline Support**: Funcionamento offline básico

#### 4. DASHBOARDS E ANALYTICS
- **Business Intelligence**: Métricas em tempo real
- **Relatórios Visuais**: Gráficos interativos
- **KPI Monitoring**: Acompanhamento de indicadores
- **Export Features**: PDF, Excel, CSV

### STACK TECNOLÓGICO

#### Frontend Framework:
```typescript
// Next.js 14 com App Router
// React 18 com Suspense
// TypeScript para type safety
// Tailwind CSS para styling
// Radix UI para componentes base
// Framer Motion para animações
// React Query para data fetching
// Zustand para state management
```

#### UI/UX Libraries:
```typescript
const TECH_STACK = {
  framework: "Next.js 14",
  language: "TypeScript",
  styling: "Tailwind CSS + CSS Modules", 
  components: "Radix UI + Headless UI",
  animations: "Framer Motion",
  charts: "Recharts + D3.js",
  forms: "React Hook Form + Zod",
  state: "Zustand + React Query",
  testing: "Jest + Testing Library + Playwright"
};
```

### COMPONENTES PRINCIPAIS A DESENVOLVER

#### 1. DESIGN SYSTEM CORE
```typescript
// Component Library Structure
interface DesignSystem {
  tokens: {
    colors: ColorSystem;
    typography: TypographySystem; 
    spacing: SpacingSystem;
    breakpoints: BreakpointSystem;
    shadows: ShadowSystem;
    animations: AnimationSystem;
  };
  
  components: {
    // Basic Components
    Button: ButtonComponent;
    Input: InputComponent;
    Card: CardComponent;
    Modal: ModalComponent;
    
    // Complex Components  
    Calendar: CalendarComponent;
    Chat: ChatComponent;
    DataTable: DataTableComponent;
    Dashboard: DashboardComponent;
  };
}
```

#### 2. CHAT INTERFACE COMPONENT
```typescript
interface ChatInterface {
  // Core chat functionality
  sendMessage(message: string): Promise<void>;
  receiveMessage(message: AIResponse): void;
  
  // UI State
  isTyping: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  
  // Advanced Features
  voiceInput: VoiceInputHandler;
  quickReplies: QuickReply[];
  contextMenu: ContextMenuActions;
  messageHistory: MessageHistoryManager;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    entities?: ExtractedEntity[];
    confidence?: number;
    actions?: MessageAction[];
  };
}
```

#### 3. APPOINTMENT BOOKING COMPONENT
```typescript
interface AppointmentBooking {
  // Booking flow
  specialtySelection: SpecialtySelector;
  doctorSelection: DoctorSelector;
  dateTimeSelection: DateTimePicker;
  patientInfo: PatientInfoForm;
  confirmation: BookingConfirmation;
  
  // Smart features
  aiSuggestions: SmartSuggestions;
  conflictResolution: ConflictHandler;
  alternativeOptions: AlternativeProvider;
}
```

### PÁGINAS E ROTAS

#### 1. ESTRUTURA DE ROTAS
```typescript
const APP_ROUTES = {
  // Public Routes
  '/': 'HomePage',
  '/login': 'LoginPage', 
  '/register':