# EO Clínica - Frontend

Interface web moderna para o sistema de agendamento médico EO Clínica, construída com Next.js 15, React 19, e Tailwind CSS.

## 🚀 Funcionalidades

- **Sistema de Autenticação** - Login/registro com diferentes tipos de usuário
- **Dashboard Inteligente** - Interface personalizada por perfil (Admin, Médico, Paciente, Recepcionista)
- **Agendamento de Consultas** - Sistema completo de marcação e gestão de consultas
- **Chat com IA** - Assistente virtual para suporte aos pacientes
- **Calendário Interativo** - Visualização e gestão de horários
- **Portal do Médico** - Gestão de pacientes, prontuários e agenda
- **Portal do Paciente** - Histórico, agendamentos e comunicação
- **Conformidade LGPD** - Proteção de dados integrada

## 🛠️ Tecnologias

- **Framework**: Next.js 15 com App Router
- **UI**: React 19, Tailwind CSS, Radix UI
- **Estado**: Zustand com persistência
- **Requisições**: Axios com React Query
- **Formulários**: React Hook Form + Zod
- **Animações**: Framer Motion
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **Real-time**: Socket.io Client

## 🚦 Como Executar

### Pré-requisitos
- Node.js 18+
- Backend da API rodando na porta 3000

### Instalação e Execução

```bash
# Clone o repositório (se não tiver feito)
git clone <repo-url>
cd eo-clinica2/frontend

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run dev

# Ou use o script personalizado
./start.sh
```

O frontend estará disponível em: http://localhost:3001

### Build para Produção

```bash
# Build da aplicação
npm run build

# Executar em produção
npm start
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na pasta frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Docker (Opcional)

```bash
# Build da imagem
docker build -t eo-clinica-frontend .

# Executar container
docker run -p 3001:3000 eo-clinica-frontend
```

## 📱 Estrutura de Páginas

```
src/app/
├── page.tsx              # Landing page
├── auth/
│   ├── login/            # Página de login
│   └── register/         # Página de cadastro
├── dashboard/            # Dashboard principal
├── admin/               # Portal administrativo
├── doctor/              # Portal do médico
├── patient/             # Portal do paciente
├── appointments/        # Gestão de consultas
└── chat/               # Chat com IA
```

## 🧩 Componentes

```
src/components/
├── ui/                  # Componentes base (buttons, inputs, etc.)
├── forms/               # Formulários reutilizáveis
├── layout/              # Componentes de layout
├── dashboard/           # Componentes do dashboard
├── appointments/        # Componentes de agendamento
├── calendar/            # Componentes de calendário
└── chat/               # Componentes do chat
```

## 👥 Tipos de Usuário

### Admin
- Gestão completa do sistema
- Relatórios e analytics
- Configurações globais

### Médico
- Agenda pessoal
- Prontuários eletrônicos
- Comunicação com pacientes

### Paciente
- Agendamento de consultas
- Histórico médico
- Chat com IA

### Recepcionista
- Gestão de agendamentos
- Atendimento aos pacientes
- Relatórios operacionais

## 🔐 Credenciais Padrão

- **Admin**: admin@eoclinica.com.br / Admin123!
- **Médico**: dr.silva@eoclinica.com.br / Admin123!
- **Recepcionista**: recepcao@eoclinica.com.br / Admin123!
- **Paciente**: paciente@example.com / Admin123!

## 🤝 Integração com Backend

O frontend se conecta automaticamente com a API backend em:
- **API REST**: http://localhost:3000
- **WebSocket**: ws://localhost:3000
- **Documentação**: http://localhost:3000/documentation

## 📄 Licença

Este projeto é parte do sistema EO Clínica.
