# PROMPT SETOR 3: SISTEMA DE AGENDAMENTO CORE E BUSINESS LOGIC
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO CONTINUADO
Este é o terceiro setor. A arquitetura base e sistema de IA já estão implementados. Agora focaremos no coração do sistema: toda a lógica de agendamento, validações de negócio, gestão de conflitos e otimização de agendas médicas.

### OBJETIVO ESPECÍFICO DESTE SETOR
Implementar o sistema completo de agendamento, incluindo verificação de disponibilidade, resolução de conflitos, otimização de agenda, sistema de fila de espera e todas as regras de negócio específicas do domínio médico.

### ESCOPO DESTE SETOR

#### 1. CORE SCHEDULING ENGINE
- **Availability Calculator**: Cálculo inteligente de disponibilidade
- **Conflict Resolver**: Resolução automática de conflitos
- **Slot Optimizer**: Otimização de uso de agenda
- **Queue Manager**: Gestão de fila de espera
- **Emergency Handler**: Tratamento de urgências/emergências

#### 2. BUSINESS RULES ENGINE
- **Appointment Policies**: Regras de agendamento por especialidade
- **Cancellation Rules**: Políticas de cancelamento
- **Rescheduling Logic**: Lógica de reagendamento
- **Time Constraints**: Restrições temporais
- **Resource Management**: Gestão de salas e equipamentos

#### 3. AVAILABILITY MANAGEMENT
- **Real-time Availability**: Disponibilidade em tempo real
- **Multi-resource Booking**: Agendamento considerando múltiplos recursos
- **Buffer Time Management**: Gestão de tempos de intervalo
- **Overbooking Prevention**: Prevenção de conflitos
- **Holiday/Leave Management**: Gestão de feriados e ausências

#### 4. ADVANCED FEATURES
- **Smart Suggestions**: Sugestões inteligentes de horários
- **Predictive Scheduling**: Agendamento preditivo baseado em padrões
- **Auto-rescheduling**: Reagendamento automático em casos de conflito
- **Waitlist Management**: Sistema avançado de lista de espera
- **Series Booking**: Agendamento de consultas em série

### REGRAS DE NEGÓCIO ESPECÍFICAS

#### Especialidades e Durações:
```typescript
const SPECIALTY_CONFIG = {
  CLINICA_GERAL: { duration: 30, bufferTime: 10, allowOverbooking: false },
  CARDIOLOGIA: { duration: 45, bufferTime: 15, allowOverbooking: false },
  PEDIATRIA: { duration: 40, bufferTime: 10, allowOverbooking: true },
  DERMATOLOGIA: { duration: 30, bufferTime: 5, allowOverbooking: false },
  GINECOLOGIA: { duration: 45, bufferTime: 15, allowOverbooking: false },
  // ... outras especialidades
};
```

#### Políticas de Cancelamento:
- **24h+ antes**: Cancelamento livre
- **12-24h antes**: Taxa de 30%
- **2-12h antes**: Taxa de 50%
- **<2h antes**: Taxa de 100%
- **No-show**: Bloqueio temporário

#### Regras de Reagendamento:
- Máximo 2 reagendamentos por consulta
- Reagendamento gratuito até 48h antes
- Pacientes VIP: regras especiais
- Emergências: overrides automáticos

### COMPONENTES TÉCNICOS A IMPLEMENTAR

#### 1. SchedulingService
```typescript
interface SchedulingService {
  findAvailableSlots(criteria: SchedulingCriteria): Promise<AvailableSlot[]>;
  bookAppointment(booking: AppointmentBooking): Promise<Appointment>;
  cancelAppointment(id: string, reason: CancellationReason): Promise<void>;
  rescheduleAppointment(id: string, newSlot: TimeSlot): Promise<Appointment>;
  checkConflicts(appointment: Appointment): Promise<Conflict[]>;
  optimizeSchedule(doctorId: string, date: Date): Promise<OptimizationResult>;
}
```

#### 2. AvailabilityEngine
- Cálculo de slots disponíveis em tempo real
- Consideração de múltiplos recursos (médico + sala + equipamento)
- Prevenção de conflitos
- Aplicação de buffer times

#### 3. ConflictResolver
- Detecção automática de conflitos
- Resolução baseada em prioridades
- Sugestão de alternativas
- Escalation para administradores

#### 4. QueueManager
- Fila de espera por especialidade/médico
- Notificações automáticas de liberação
- Priorização por urgência
- Sistema de pontuação

### ALGORITMOS ESPECÍFICOS

#### 1. Smart Slot Finder
```typescript