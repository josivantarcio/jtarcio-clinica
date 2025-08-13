# EO Clínica - Medical Scheduling System with AI Integration

## Overview

EO Clínica is a comprehensive medical clinic scheduling system that integrates AI-powered conversations, automated workflows, and complete medical appointment management. This is **Sector 1: Architecture and Initial Setup** of the complete system.

## 🏗️ Architecture

This system follows clean architecture principles with:

- **Backend**: Node.js + TypeScript + Fastify (production-ready)
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4 + Radix UI
- **Database**: PostgreSQL 15 with Prisma ORM (complete schema)
- **Cache**: Redis 7 for sessions and caching
- **AI Integration**: Claude Sonnet 4 API (fully integrated)
- **Vector Database**: ChromaDB for embeddings and context
- **Automation**: N8N workflows (custom nodes implemented)
- **Containerization**: Docker & Docker Compose (monorepo workspaces)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- npm >= 9.0.0

### Installation

1. **Clone and setup the project:**
   ```bash
   cd /home/josivan/ws/eo-clinica2
   npm install  # Installs both backend and frontend (workspaces configured)
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the system:**
   ```bash
   # Method 1: Use hybrid production script (RECOMMENDED)
   ./scripts/start-production.sh
   
   # This will:
   # - STOP ALL existing processes (Docker + Local) for clean start
   # - Start infrastructure in Docker (PostgreSQL, Redis, ChromaDB, N8N, PgAdmin)  
   # - Run backend and frontend locally for better development experience
   # - Provide automatic backup, health checks and rollback capabilities
   
   # Method 2: Manual setup
   # 1. Start Docker infrastructure only
   docker-compose up -d postgres redis chromadb n8n pgadmin
   
   # 2. Generate Prisma client
   npm run db:generate
   
   # 3. Run database migrations
   npm run db:migrate
   
   # 4. Seed the database
   npm run db:seed
   
   # 5. Start backend locally (port 3000)
   npm run start
   
   # 6. Start frontend locally (port 3001) - in another terminal
   cd frontend && PORT=3001 npm run dev
   ```

4. **Access the services:**
   
   **🏠 Local Services:**
   - **Frontend (User Interface)**: http://localhost:3001
   - **Backend API**: http://localhost:3000
   - **API Documentation (Swagger)**: http://localhost:3000/documentation
   
   **🐳 Docker Services:**
   - **N8N Workflows**: http://localhost:5678 (admin/admin123)
   - **PgAdmin (Database)**: http://localhost:5050 (admin@clinic.com/admin123)
   - **PostgreSQL**: localhost:5433
   - **Redis**: localhost:6380
   - **ChromaDB**: http://localhost:8000

## 🎨 Frontend Interface

The system includes a modern web interface built with Next.js:

### Quick Start Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not done yet)
npm install

# Start development server
npm run dev
# or use the helper script
./start.sh
```

The frontend will be available at: **http://localhost:3001**

### Frontend Features ✅ IMPLEMENTADAS
- **Dashboard** - Página inicial com estatísticas e métricas
- **Pacientes** - Gestão completa de pacientes com filtros e busca
- **Agendamentos** - Sistema completo de agendamento de consultas
- **Médicos** - Gerenciamento da equipe médica e especialidades
- **Agenda/Calendário** - Visualização de agenda médica completa
- **Configurações** - Painel completo de configurações do usuário
- **Relatórios/Analytics** - Relatórios detalhados com gráficos interativos
- **Autenticação** - Login/registro com controle de acesso baseado em roles
- **AI Chat Interface** - Interface de chat com IA integrada para pacientes
- **Conformidade LGPD** - Sistema completo de conformidade e privacidade
- **Notificações** - Sistema de notificações em tempo real
- **Interface Responsiva** - Design otimizado para mobile e desktop

### User Portals
- **Admin Portal**: System management and analytics
- **Doctor Portal**: Patient management and scheduling
- **Patient Portal**: Appointment booking and history
- **Receptionist Portal**: Front desk operations

For detailed frontend documentation, see: [`frontend/README.md`](frontend/README.md)

## 📊 Database Schema

The system includes comprehensive models for:

- **Users**: Patients, doctors, admins, and receptionists
- **Appointments**: Complete scheduling with status tracking
- **Medical Specialties**: Configurable medical specialties
- **Availability**: Doctor availability management
- **Conversations**: AI conversation history
- **Audit Logs**: LGPD compliance and security tracking

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start backend development server (port 3000)
npm run start           # Start backend production server

# Frontend (from /frontend directory)
npm run dev             # Start frontend development server (port 3001)
npm run build          # Build frontend for production
npm run start          # Start frontend production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database with initial data

# Docker Services
npm run docker:up       # Start all Docker services
npm run docker:down     # Stop all Docker services
npm run docker:logs     # View container logs

# Development Tools
npm run lint            # Run ESLint (backend)
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run test            # Run tests
npm run test:coverage   # Run tests with coverage

# Helper Scripts
./scripts/start-production.sh  # Complete hybrid deployment (Docker infrastructure + Local services)
```

## 🎯 Medical Specialties

The system comes pre-configured with Brazilian medical specialties:

- Clínica Geral (30min)
- Cardiologia (45min)
- Dermatologia (30min)
- Ginecologia (45min)
- Pediatria (30min)
- Ortopedia (45min)
- Oftalmologia (30min)
- Neurologia (60min)
- Psiquiatria (50min)
- Endocrinologia (45min)
- Urologia (30min)
- Otorrinolaringologia (30min)

## 🏥 Business Rules

- **Minimum scheduling advance**: 2 hours
- **Cancellation notice**: 24 hours minimum
- **Maximum reschedules**: 2 per appointment
- **Working hours**: 7AM-7PM (Mon-Fri), 8AM-2PM (Sat)
- **Appointment duration**: 30-60 minutes depending on specialty

## 🔐 Security Features

- JWT authentication with refresh tokens
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod
- SQL injection prevention with Prisma
- CORS protection
- Helmet security headers
- Password hashing with bcrypt
- Audit logging for LGPD compliance

## 📝 Default Users

The system seeds with default users (password: `Admin123!`):

- **Admin**: admin@eoclinica.com.br
- **Doctor**: dr.silva@eoclinica.com.br (Dr. João Silva - Clínica Geral)
- **Receptionist**: recepcao@eoclinica.com.br
- **Patient**: paciente@example.com (Ana Costa)

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user profile

### Users
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (soft delete)

### Appointments
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/appointments/:id` - Get appointment details
- `PATCH /api/v1/appointments/:id` - Update appointment
- `POST /api/v1/appointments/:id/reschedule` - Reschedule appointment
- `POST /api/v1/appointments/:id/cancel` - Cancel appointment
- `POST /api/v1/appointments/:id/confirm` - Confirm appointment
- `POST /api/v1/appointments/:id/complete` - Complete appointment

### Specialties
- `GET /api/v1/specialties` - List specialties
- `GET /api/v1/specialties/:id` - Get specialty details
- `GET /api/v1/specialties/:id/doctors` - Get doctors by specialty

### Availability
- `GET /api/v1/availability/doctor/:doctorId` - Get doctor availability
- `GET /api/v1/availability/specialty/:specialtyId` - Get availability by specialty

## 🔄 Integration Points

The system is prepared for integration with:

- **WhatsApp Business API**: Patient communication
- **Google Calendar**: Calendar synchronization
- **N8N Workflows**: Automation and integrations
- **Claude Sonnet 4**: AI conversations
- **ChromaDB**: Vector embeddings for AI

## 📈 Monitoring & Logging

- Structured logging with Winston
- Daily rotating log files
- Health check endpoints
- Error tracking and alerting
- Audit trail for LGPD compliance

## 🛡️ LGPD Compliance

- Data retention policies (7 years for medical data)
- Audit logging (10 years retention)
- Data anonymization after retention period
- Encrypted sensitive data storage
- User consent tracking

## 🏃 Next Steps

After completing Sector 1, the system is ready for:

- **Sector 2**: AI Integration and Natural Language Processing
- **Sector 3**: Core Scheduling Logic
- **Sector 4**: N8N Workflow Automation
- **Sector 5**: Frontend Implementation

## 🤝 Contributing

This is a complete foundation for a medical clinic system. All endpoints return "NOT_IMPLEMENTED" responses that should be replaced with actual business logic in subsequent development phases.

## 📄 License

MIT License - see LICENSE file for details.

---

**EO Clínica System - Sector 1 Complete** ✅