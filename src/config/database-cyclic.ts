// Mock database para Cyclic.sh - usando armazenamento em memória para demo
// Para produção real, usar Cyclic PostgreSQL ou MongoDB addon

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  status: string;
  type: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data storage
const mockDatabase = {
  users: [
    {
      id: 'cyclic-admin-1',
      email: 'admin@eoclinica.com.br',
      password: '$2a$12$vQH.ZbR4mJZqRgJ5V4N8leQxLgOVHkB8iP.dMO4Jqt5HuO6Zl2XJa', // Admin123!
      firstName: 'Admin',
      lastName: 'Cyclic',
      fullName: 'Admin Cyclic',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '(11) 99999-9999',
      timezone: 'America/Sao_Paulo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cyclic-doctor-1',
      email: 'doctor@eoclinica.com.br',
      password: '$2a$12$vQH.ZbR4mJZqRgJ5V4N8leQxLgOVHkB8iP.dMO4Jqt5HuO6Zl2XJa', // Admin123!
      firstName: 'Dr. João',
      lastName: 'Silva',
      fullName: 'Dr. João Silva',
      role: 'DOCTOR',
      status: 'ACTIVE',
      phone: '(11) 99999-8888',
      timezone: 'America/Sao_Paulo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cyclic-patient-1',
      email: 'patient@eoclinica.com.br',
      password: '$2a$12$vQH.ZbR4mJZqRgJ5V4N8leQxLgOVHkB8iP.dMO4Jqt5HuO6Zl2XJa', // Admin123!
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      role: 'PATIENT',
      status: 'ACTIVE',
      phone: '(11) 99999-7777',
      timezone: 'America/Sao_Paulo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as User[],
  
  appointments: [
    {
      id: 'cyclic-apt-1',
      patientId: 'cyclic-patient-1',
      doctorId: 'cyclic-doctor-1',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'SCHEDULED',
      type: 'CONSULTATION',
      notes: 'Consulta de rotina',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as Appointment[],
};

// Mock Prisma client para Cyclic
export const cyclicPrisma = {
  user: {
    findUnique: async ({ where }: { where: any }) => {
      if (where.email) {
        return mockDatabase.users.find(u => u.email === where.email.toLowerCase()) || null;
      }
      if (where.id) {
        return mockDatabase.users.find(u => u.id === where.id) || null;
      }
      return null;
    },
    
    findMany: async ({ where }: { where?: any } = {}) => {
      let users = [...mockDatabase.users];
      
      if (where?.role) {
        users = users.filter(u => u.role === where.role);
      }
      if (where?.status) {
        users = users.filter(u => u.status === where.status);
      }
      
      return users;
    },
    
    create: async ({ data }: { data: any }) => {
      const newUser: User = {
        id: `cyclic-user-${Date.now()}`,
        ...data,
        fullName: `${data.firstName} ${data.lastName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockDatabase.users.push(newUser);
      return newUser;
    },
    
    update: async ({ where, data }: { where: any; data: any }) => {
      const userIndex = mockDatabase.users.findIndex(u => 
        (where.id && u.id === where.id) || 
        (where.email && u.email === where.email)
      );
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      const updatedUser = {
        ...mockDatabase.users[userIndex],
        ...data,
        updatedAt: new Date(),
      };
      
      mockDatabase.users[userIndex] = updatedUser;
      return updatedUser;
    },
    
    count: async () => {
      return mockDatabase.users.length;
    },
  },
  
  appointment: {
    findMany: async ({ where }: { where?: any } = {}) => {
      let appointments = [...mockDatabase.appointments];
      
      if (where?.patientId) {
        appointments = appointments.filter(a => a.patientId === where.patientId);
      }
      if (where?.doctorId) {
        appointments = appointments.filter(a => a.doctorId === where.doctorId);
      }
      if (where?.status) {
        appointments = appointments.filter(a => a.status === where.status);
      }
      
      return appointments;
    },
    
    create: async ({ data }: { data: any }) => {
      const newAppointment: Appointment = {
        id: `cyclic-apt-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockDatabase.appointments.push(newAppointment);
      return newAppointment;
    },
    
    count: async () => {
      return mockDatabase.appointments.length;
    },
  },
  
  // Health check para connection
  $queryRaw: async () => {
    return [{ result: 1 }];
  },
  
  // Mock disconnect
  $disconnect: async () => {
    console.log('Mock database disconnected');
  },
};

export { mockDatabase };