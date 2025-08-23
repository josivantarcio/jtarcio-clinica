# EO Clínica - Sistema de Notificações por Email
## Plano de Implementação Completo para Notificações Profissionais

### 📧 VISÃO GERAL

Sistema completo de notificações por email profissionais para o EO Clínica, incluindo notificações automáticas para registro de médicos, pacientes, confirmações de consultas, e relatórios fiscais com anexos PDF para dedução do Imposto de Renda.

**Data de Planejamento**: 22 de agosto de 2025  
**Versão Planejada**: 1.4.0  
**Status**: 📋 Plano de Implementação Completo

---

## 🎯 FINALIDADES E PROPÓSITOS DE EMAIL

### **1. GESTÃO DE USUÁRIOS**

#### **1.1 Cadastro de Médicos**
- **Finalidade**: Boas-vindas profissionais e instruções de acesso
- **Trigger**: Conclusão do cadastro de médico no sistema
- **Conteúdo**: Credenciais de acesso, orientações da plataforma, cronograma de treinamento
- **Anexos**: Manual do médico (PDF), regulamento interno

#### **1.2 Cadastro de Pacientes** 
- **Finalidade**: Confirmação de cadastro e orientações iniciais
- **Trigger**: Registro concluído de paciente
- **Conteúdo**: Confirmação de dados, próximos passos, políticas de privacidade
- **Anexos**: Cartilha do paciente (PDF), termos LGPD

#### **1.3 Ativação de Conta**
- **Finalidade**: Confirmação de email e ativação
- **Trigger**: Cadastro pendente de confirmação
- **Conteúdo**: Link de ativação, prazo de validade

### **2. GESTÃO DE CONSULTAS**

#### **2.1 Confirmação de Agendamento**
- **Finalidade**: Confirmar dados da consulta agendada
- **Trigger**: Nova consulta agendada
- **Conteúdo**: Data, horário, médico, especialidade, localização
- **Para**: Paciente e médico

#### **2.2 Lembretes de Consulta**
- **Finalidade**: Reduzir no-show e confirmar presença
- **Trigger**: 24h, 2h antes da consulta
- **Conteúdo**: Lembrete com detalhes, opção de cancelamento/reagendamento

#### **2.3 Cancelamento de Consulta**
- **Finalidade**: Informar cancelamento e próximos passos
- **Trigger**: Consulta cancelada por qualquer parte
- **Conteúdo**: Motivo, reagendamento automático se aplicável

#### **2.4 Reagendamento**
- **Finalidade**: Confirmar nova data/horário
- **Trigger**: Consulta reagendada
- **Conteúdo**: Comparação data anterior vs nova, confirmação

### **3. GESTÃO FINANCEIRA E FISCAL**

#### **3.1 Comprovante de Pagamento**
- **Finalidade**: Confirmar recebimento de pagamento
- **Trigger**: Pagamento processado com sucesso
- **Conteúdo**: Detalhes da transação, método de pagamento
- **Anexos**: Recibo oficial (PDF)

#### **3.2 Relatório de Dedução IR (PRINCIPAL)**
- **Finalidade**: **Fornecer comprovantes para dedução do Imposto de Renda**
- **Trigger**: **Pagamento de consulta/exame concluído**
- **Conteúdo**: **Dados fiscais completos, instruções de uso no IR**
- **Anexos**: **Relatório fiscal detalhado (PDF) com todas as informações necessárias**
- **Frequência**: Mensal e anual

#### **3.3 Fatura Mensal**
- **Finalidade**: Cobrança de mensalidades/planos
- **Trigger**: Início do mês para contas em aberto
- **Conteúdo**: Detalhamento de serviços, valor, vencimento

### **4. COMUNICAÇÃO MÉDICA**

#### **4.1 Resultados de Exames**
- **Finalidade**: Notificar disponibilidade de resultados
- **Trigger**: Exame processado e liberado
- **Conteúdo**: Notificação de disponibilidade, instruções de acesso
- **Anexos**: Laudo médico (PDF) quando aplicável

#### **4.2 Prescrições e Receitas**
- **Finalidade**: Enviar prescrições médicas
- **Trigger**: Prescrição emitida após consulta
- **Conteúdo**: Orientações médicas, validade
- **Anexos**: Receita digital (PDF)

### **5. COMUNICAÇÃO ADMINISTRATIVA**

#### **5.1 Alteração de Política**
- **Finalidade**: Comunicar mudanças importantes
- **Trigger**: Atualização de termos, políticas
- **Conteúdo**: Resumo das mudanças, data de vigência

#### **5.2 Manutenção do Sistema**
- **Finalidade**: Informar sobre indisponibilidades
- **Trigger**: Manutenção programada
- **Conteúdo**: Data/horário, duração estimada, canais alternativos

#### **5.3 Newsletters Médicas**
- **Finalidade**: Conteúdo educativo e informativo
- **Trigger**: Agendamento mensal
- **Conteúdo**: Dicas de saúde, novidades médicas, campanhas

---

## 🏗️ ARQUITETURA DO SISTEMA

### **Estrutura de Módulos**

```
src/modules/email/
├── templates/                    # Templates de email
│   ├── doctor-registration.hbs   # Cadastro de médico
│   ├── patient-registration.hbs  # Cadastro de paciente
│   ├── appointment-confirmation.hbs
│   ├── appointment-reminder.hbs
│   ├── tax-deduction.hbs         # Dedução IR (PRINCIPAL)
│   ├── payment-receipt.hbs
│   └── base/                     # Templates base
│       ├── header.hbs
│       ├── footer.hbs
│       └── layout.hbs
├── services/
│   ├── email.service.ts          # Serviço principal
│   ├── pdf-generator.service.ts  # Geração de PDFs
│   ├── template.service.ts       # Renderização de templates
│   └── notification-queue.service.ts # Fila de envios
├── types/
│   ├── email.types.ts           # Tipos TypeScript
│   └── tax-deduction.types.ts   # Tipos para IR
├── utils/
│   ├── email-validator.ts       # Validação de emails
│   ├── template-helpers.ts      # Helpers Handlebars
│   └── pdf-utils.ts            # Utilitários PDF
└── config/
    ├── email.config.ts          # Configurações
    └── smtp.config.ts           # SMTP settings
```

### **Tecnologias e Bibliotecas**

```json
{
  "email": {
    "transporter": "nodemailer",
    "templates": "handlebars",
    "queue": "bull + redis",
    "pdf": "puppeteer",
    "validation": "joi + validator"
  },
  "design": {
    "framework": "mjml",
    "styling": "inline CSS",
    "responsive": "media queries",
    "images": "base64 embedded"
  },
  "storage": {
    "attachments": "local storage + S3 ready",
    "templates": "filesystem",
    "logs": "winston"
  }
}
```

---

## 📐 DESIGN DE TEMPLATES PROFISSIONAIS

### **Estrutura Base do Email**

```html
<!-- Header Profissional -->
<header style="background: #1e40af; padding: 20px;">
  <img src="logo-eo-clinica.png" alt="EO Clínica" style="height: 40px;">
  <h1 style="color: white; margin: 0;">EO Clínica</h1>
  <p style="color: #e2e8f0; margin: 0;">Sistema Inteligente de Gestão Médica</p>
</header>

<!-- Corpo Principal -->
<main style="padding: 30px; background: white; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
    {{emailTitle}}
  </h2>
  
  <div style="line-height: 1.6; color: #334155; font-family: Arial, sans-serif;">
    {{emailContent}}
  </div>
  
  <!-- Área de Ação (CTAs) -->
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{actionUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      {{actionText}}
    </a>
  </div>
</main>

<!-- Footer Profissional -->
<footer style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
    <p><strong>EO Clínica</strong> - Sistema de Gestão Médica</p>
    <p>Este email foi enviado automaticamente. Não responda a esta mensagem.</p>
    <p>Para suporte, entre em contato: <a href="mailto:suporte@eo-clinica.com.br">suporte@eo-clinica.com.br</a></p>
    <p style="margin-top: 15px;">
      <a href="{{unsubscribeUrl}}" style="color: #64748b;">Cancelar notificações</a> | 
      <a href="{{privacyUrl}}" style="color: #64748b;">Política de Privacidade</a>
    </p>
  </div>
</footer>
```

### **Templates Específicos**

#### **1. Template: Cadastro de Médico**

```handlebars
{{> layout title="Bem-vindo à EO Clínica, Dr. {{doctorName}}"}}

<h2>Seja bem-vindo(a) à nossa equipe médica!</h2>

<p>Prezado(a) Dr. {{doctorName}},</p>

<p>É com grande satisfação que confirmamos seu cadastro em nossa plataforma EO Clínica. Seus dados foram registrados com sucesso e sua conta está ativa.</p>

<div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; color: #1e40af;">Dados de Acesso</h3>
  <p><strong>Email:</strong> {{doctorEmail}}</p>
  <p><strong>CRM:</strong> {{crmNumber}}</p>
  <p><strong>Especialidade:</strong> {{specialty}}</p>
  <p><strong>URL da Plataforma:</strong> <a href="{{platformUrl}}">{{platformUrl}}</a></p>
</div>

<h3>Próximos Passos:</h3>
<ol>
  <li>Acesse a plataforma com suas credenciais</li>
  <li>Complete seu perfil profissional</li>
  <li>Configure sua agenda de atendimentos</li>
  <li>Participe do treinamento de orientação (agendado para {{trainingDate}})</li>
</ol>

<p>Em caso de dúvidas, nossa equipe de suporte está disponível para auxiliá-lo.</p>

<p>Atenciosamente,<br>
<strong>Equipe EO Clínica</strong></p>
```

#### **2. Template: Cadastro de Paciente**

```handlebars
{{> layout title="Cadastro realizado com sucesso - EO Clínica"}}

<h2>Seja bem-vindo(a) à EO Clínica!</h2>

<p>Olá, {{patientName}}!</p>

<p>Seu cadastro foi realizado com sucesso em nossa plataforma. Agora você pode agendar consultas de forma rápida e prática.</p>

<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; color: #059669;">Dados Confirmados</h3>
  <p><strong>Nome:</strong> {{patientName}}</p>
  <p><strong>Email:</strong> {{patientEmail}}</p>
  <p><strong>CPF:</strong> {{cpf}}</p>
  <p><strong>Telefone:</strong> {{phone}}</p>
</div>

<h3>Como usar a plataforma:</h3>
<ul>
  <li>Agende consultas online 24/7</li>
  <li>Receba lembretes automáticos</li>
  <li>Acesse seu histórico médico</li>
  <li>Chat com nossa IA para dúvidas rápidas</li>
</ul>

<div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
  <p style="margin: 0;"><strong>⚠️ Importante:</strong> Seus dados estão protegidos de acordo com a LGPD. Leia nossa <a href="{{privacyPolicyUrl}}">Política de Privacidade</a>.</p>
</div>

<p>Pronto para agendar sua primeira consulta?</p>
```

#### **3. Template: Dedução Imposto de Renda (PRINCIPAL)**

```handlebars
{{> layout title="Comprovante Fiscal - Dedução Imposto de Renda"}}

<h2>Comprovante para Dedução do Imposto de Renda</h2>

<p>Prezado(a) {{patientName}},</p>

<p>Segue em anexo o comprovante fiscal referente aos serviços médicos realizados na EO Clínica, para sua declaração do Imposto de Renda {{taxYear}}.</p>

<div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
  <h3 style="margin-top: 0; color: #0284c7;">Resumo Fiscal {{taxYear}}</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Total de Consultas:</td>
      <td style="padding: 8px 0;">{{totalAppointments}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Total de Exames:</td>
      <td style="padding: 8px 0;">{{totalExams}}</td>
    </tr>
    <tr style="border-top: 2px solid #0284c7;">
      <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Total Dedutível:</td>
      <td style="padding: 12px 0; font-weight: bold; font-size: 16px; color: #059669;">R$ {{totalDeductibleAmount}}</td>
    </tr>
  </table>
</div>

<div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; color: #d97706;">📋 Instruções para Declaração</h3>
  <ol>
    <li>Baixe o arquivo PDF em anexo</li>
    <li>Na declaração do IR, vá para "Pagamentos Efetuados"</li>
    <li>Selecione "Pagamentos a Médicos, Dentistas, etc."</li>
    <li>Informe nosso CNPJ: {{clinicCnpj}}</li>
    <li>Digite o valor total: R$ {{totalDeductibleAmount}}</li>
  </ol>
</div>

<p><strong>📎 Documentos em Anexo:</strong></p>
<ul>
  <li>📄 <strong>comprovante-fiscal-{{taxYear}}-{{patientCpf}}.pdf</strong> - Relatório detalhado</li>
  <li>📊 <strong>resumo-consultas-{{taxYear}}.pdf</strong> - Detalhamento por consulta</li>
</ul>

<div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
  <p style="margin: 0;"><strong>⚠️ Importante:</strong> Guarde este comprovante junto com sua documentação fiscal. Em caso de fiscalização, apresente os documentos em anexo.</p>
</div>

<p>Em caso de dúvidas sobre a declaração, consulte um contador ou entre em contato conosco.</p>

<p>Atenciosamente,<br>
<strong>Setor Fiscal - EO Clínica</strong><br>
CNPJ: {{clinicCnpj}}<br>
Telefone: {{clinicPhone}}</p>
```

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### **1. Serviço Principal de Email**

```typescript
// src/modules/email/services/email.service.ts

export interface EmailData {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  attachments?: Attachment[];
  priority?: 'high' | 'normal' | 'low';
  scheduled?: Date;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templateService: TemplateService;
  private pdfService: PDFGeneratorService;
  private queue: Queue;

  constructor() {
    this.transporter = this.createTransporter();
    this.templateService = new TemplateService();
    this.pdfService = new PDFGeneratorService();
    this.queue = new Queue('email-queue');
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // 1. Validar dados de entrada
      await this.validateEmailData(emailData);

      // 2. Renderizar template
      const html = await this.templateService.render(
        emailData.templateName, 
        emailData.templateData
      );

      // 3. Preparar anexos (incluindo PDFs)
      const attachments = await this.prepareAttachments(emailData);

      // 4. Configurar email
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.email.fromAddress,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html,
        attachments,
        priority: emailData.priority || 'normal'
      };

      // 5. Enviar email
      const result = await this.transporter.sendMail(mailOptions);

      // 6. Log de auditoria
      await this.logEmailSent(emailData, result);

      return true;
    } catch (error) {
      await this.logEmailError(emailData, error);
      throw error;
    }
  }

  // Método especializado para emails fiscais
  async sendTaxDeductionEmail(
    patientId: string, 
    taxYear: number
  ): Promise<boolean> {
    const taxData = await this.generateTaxDeductionData(patientId, taxYear);
    const pdfAttachment = await this.pdfService.generateTaxDeductionPDF(taxData);

    return this.sendEmail({
      to: taxData.patientEmail,
      subject: `Comprovante Fiscal ${taxYear} - EO Clínica`,
      templateName: 'tax-deduction',
      templateData: taxData,
      attachments: [pdfAttachment],
      priority: 'high'
    });
  }
}
```

### **2. Gerador de PDF para IR**

```typescript
// src/modules/email/services/pdf-generator.service.ts

export interface TaxDeductionData {
  patientName: string;
  patientCpf: string;
  patientEmail: string;
  taxYear: number;
  appointments: TaxDeductionAppointment[];
  totalAmount: number;
  clinicData: ClinicInfo;
}

export class PDFGeneratorService {
  async generateTaxDeductionPDF(data: TaxDeductionData): Promise<Attachment> {
    const html = await this.renderTaxDeductionTemplate(data);
    
    const pdf = await puppeteer.createPDF(html, {
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: this.getHeaderTemplate(data),
      footerTemplate: this.getFooterTemplate(),
      printBackground: true
    });

    return {
      filename: `comprovante-fiscal-${data.taxYear}-${data.patientCpf}.pdf`,
      content: pdf,
      contentType: 'application/pdf'
    };
  }

  private async renderTaxDeductionTemplate(data: TaxDeductionData): Promise<string> {
    const template = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comprovante Fiscal - EO Clínica</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #1e40af; margin-bottom: 30px; }
        .clinic-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .patient-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .appointments-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .appointments-table th, .appointments-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        .appointments-table th { background: #1e40af; color: white; }
        .total-section { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
        .footer { margin-top: 50px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>EO CLÍNICA</h1>
        <h2>COMPROVANTE PARA DEDUÇÃO - IMPOSTO DE RENDA ${data.taxYear}</h2>
        <p>CNPJ: ${data.clinicData.cnpj} | Inscrição Municipal: ${data.clinicData.municipalRegistration}</p>
      </div>

      <div class="clinic-info">
        <h3>DADOS DA CLÍNICA</h3>
        <p><strong>Razão Social:</strong> ${data.clinicData.corporateName}</p>
        <p><strong>Endereço:</strong> ${data.clinicData.address}</p>
        <p><strong>Telefone:</strong> ${data.clinicData.phone}</p>
        <p><strong>Email:</strong> ${data.clinicData.email}</p>
      </div>

      <div class="patient-info">
        <h3>DADOS DO PACIENTE</h3>
        <p><strong>Nome:</strong> ${data.patientName}</p>
        <p><strong>CPF:</strong> ${data.patientCpf}</p>
        <p><strong>Ano de Referência:</strong> ${data.taxYear}</p>
      </div>

      <h3>DETALHAMENTO DOS SERVIÇOS MÉDICOS</h3>
      <table class="appointments-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Serviço</th>
            <th>Médico</th>
            <th>CRM</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {{#each appointments}}
          <tr>
            <td>{{formatDate date}}</td>
            <td>{{service}}</td>
            <td>{{doctorName}}</td>
            <td>{{doctorCrm}}</td>
            <td>R$ {{formatCurrency amount}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <div class="total-section">
        <h3>RESUMO FISCAL</h3>
        <p><strong>Total de Atendimentos:</strong> ${data.appointments.length}</p>
        <p style="font-size: 18px;"><strong>TOTAL PARA DEDUÇÃO: R$ ${this.formatCurrency(data.totalAmount)}</strong></p>
      </div>

      <div class="footer">
        <p><strong>INSTRUÇÕES PARA DECLARAÇÃO DO IR:</strong></p>
        <ol>
          <li>Na declaração do Imposto de Renda, acesse "Pagamentos Efetuados"</li>
          <li>Selecione "Pagamentos a Médicos, Dentistas, Psicólogos, Fisioterapeutas, Terapeutas Ocupacionais e Fonoaudiólogos"</li>
          <li>Informe o CNPJ da clínica: ${data.clinicData.cnpj}</li>
          <li>Digite o valor total: R$ ${this.formatCurrency(data.totalAmount)}</li>
        </ol>
        
        <p style="margin-top: 30px;">
          <strong>Documento emitido em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br>
          <strong>Validade:</strong> Este documento é válido para a declaração do Imposto de Renda ${data.taxYear}<br>
          <strong>Autenticidade:</strong> Este documento foi gerado automaticamente pelo sistema EO Clínica
        </p>
      </div>
    </body>
    </html>
    `;

    return template;
  }
}
```

### **3. Sistema de Filas e Agendamento**

```typescript
// src/modules/email/services/notification-queue.service.ts

export class NotificationQueueService {
  private emailQueue: Queue;
  
  constructor() {
    this.emailQueue = new Queue('email-notifications', {
      redis: config.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupProcessors();
  }

  private setupProcessors() {
    // Processador para emails de cadastro
    this.emailQueue.process('user-registration', async (job) => {
      const { userType, userData } = job.data;
      
      if (userType === 'DOCTOR') {
        await this.emailService.sendDoctorRegistrationEmail(userData);
      } else if (userType === 'PATIENT') {
        await this.emailService.sendPatientRegistrationEmail(userData);
      }
    });

    // Processador para lembretes de consulta
    this.emailQueue.process('appointment-reminder', async (job) => {
      const { appointmentId, reminderType } = job.data;
      await this.emailService.sendAppointmentReminder(appointmentId, reminderType);
    });

    // Processador para emails fiscais (alta prioridade)
    this.emailQueue.process('tax-deduction', async (job) => {
      const { patientId, taxYear } = job.data;
      await this.emailService.sendTaxDeductionEmail(patientId, taxYear);
    });
  }

  // Agendar email de dedução IR (mensal)
  async scheduleMonthlyTaxReports() {
    const patients = await this.getActivePatients();
    
    for (const patient of patients) {
      await this.emailQueue.add('tax-deduction', {
        patientId: patient.id,
        taxYear: new Date().getFullYear()
      }, {
        delay: this.calculateDelay('monthly', patient.id),
        priority: 10 // Alta prioridade
      });
    }
  }

  // Agendar lembretes de consulta
  async scheduleAppointmentReminders(appointmentId: string, scheduledAt: Date) {
    const appointment = await this.getAppointment(appointmentId);
    
    // Lembrete 24h antes
    await this.emailQueue.add('appointment-reminder', {
      appointmentId,
      reminderType: '24h'
    }, {
      delay: scheduledAt.getTime() - (24 * 60 * 60 * 1000) - Date.now()
    });

    // Lembrete 2h antes
    await this.emailQueue.add('appointment-reminder', {
      appointmentId,
      reminderType: '2h'
    }, {
      delay: scheduledAt.getTime() - (2 * 60 * 60 * 1000) - Date.now()
    });
  }
}
```

---

## 🔌 INTEGRAÇÃO COM O SISTEMA EXISTENTE

### **1. Hooks de Eventos do Sistema**

```typescript
// src/modules/users/user.service.ts

export class UserService {
  private emailService: EmailService;
  private notificationQueue: NotificationQueueService;

  // Hook: Após criação de médico
  async createDoctor(doctorData: CreateDoctorDto): Promise<Doctor> {
    const doctor = await this.userRepository.createDoctor(doctorData);
    
    // Trigger: Email de cadastro de médico
    await this.notificationQueue.add('user-registration', {
      userType: 'DOCTOR',
      userData: {
        doctorName: doctor.user.name,
        doctorEmail: doctor.user.email,
        crmNumber: doctor.crmNumber,
        specialty: doctor.specialty.name,
        platformUrl: config.app.frontendUrl,
        trainingDate: this.getNextTrainingDate()
      }
    });

    return doctor;
  }

  // Hook: Após criação de paciente
  async createPatient(patientData: CreatePatientDto): Promise<Patient> {
    const patient = await this.userRepository.createPatient(patientData);
    
    // Trigger: Email de cadastro de paciente
    await this.notificationQueue.add('user-registration', {
      userType: 'PATIENT', 
      userData: {
        patientName: patient.user.name,
        patientEmail: patient.user.email,
        cpf: patient.user.cpf,
        phone: patient.user.phone,
        privacyPolicyUrl: `${config.app.frontendUrl}/privacy-policy`
      }
    });

    return patient;
  }
}
```

### **2. Hooks de Pagamentos**

```typescript
// src/modules/financial/financial.service.ts

export class FinancialService {
  private emailService: EmailService;

  // Hook: Após pagamento concluído
  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    const payment = await this.paymentRepository.createPayment(paymentData);
    
    if (payment.status === 'COMPLETED') {
      // 1. Enviar comprovante de pagamento
      await this.emailService.sendPaymentReceipt(payment);
      
      // 2. Atualizar dados fiscais para IR
      await this.updateTaxDeductionData(payment);
      
      // 3. Se final do mês, enviar relatório fiscal
      if (this.isEndOfMonth()) {
        await this.emailService.sendTaxDeductionEmail(
          payment.appointment.patientId,
          new Date().getFullYear()
        );
      }
    }

    return payment;
  }

  private async updateTaxDeductionData(payment: Payment) {
    // Atualizar tabela de deduções fiscais
    await this.taxDeductionRepository.addDeduction({
      patientId: payment.appointment.patientId,
      amount: payment.amount,
      service: payment.appointment.specialty.name,
      date: payment.createdAt,
      doctorName: payment.appointment.doctor.user.name,
      doctorCrm: payment.appointment.doctor.crmNumber,
      year: new Date().getFullYear()
    });
  }
}
```

### **3. Hooks de Consultas**

```typescript
// src/modules/appointments/appointment.service.ts

export class AppointmentService {
  private emailService: EmailService;
  private notificationQueue: NotificationQueueService;

  // Hook: Após agendamento de consulta
  async createAppointment(appointmentData: CreateAppointmentDto): Promise<Appointment> {
    const appointment = await this.appointmentRepository.create(appointmentData);
    
    // 1. Email de confirmação imediato
    await this.emailService.sendAppointmentConfirmation(appointment);
    
    // 2. Agendar lembretes automáticos
    await this.notificationQueue.scheduleAppointmentReminders(
      appointment.id, 
      appointment.scheduledAt
    );

    return appointment;
  }

  // Hook: Consulta reagendada
  async rescheduleAppointment(id: string, newData: RescheduleDto): Promise<Appointment> {
    const appointment = await this.appointmentRepository.reschedule(id, newData);
    
    // Cancelar lembretes antigos e criar novos
    await this.notificationQueue.cancelAppointmentReminders(id);
    await this.notificationQueue.scheduleAppointmentReminders(id, appointment.scheduledAt);
    
    // Email de reagendamento
    await this.emailService.sendAppointmentReschedule(appointment);

    return appointment;
  }
}
```

---

## 📊 CONFIGURAÇÃO E VARIÁVEIS DE AMBIENTE

### **Configurações SMTP**

```bash
# Configurações de Email
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=noreply@eo-clinica.com.br
EMAIL_SMTP_PASS=app_password_here

# Configurações de Templates
EMAIL_TEMPLATES_PATH=/src/modules/email/templates
EMAIL_ASSETS_PATH=/public/email-assets
EMAIL_FROM_NAME=EO Clínica
EMAIL_FROM_ADDRESS=noreply@eo-clinica.com.br

# Configurações de Fila
EMAIL_QUEUE_REDIS_URL=redis://localhost:6380
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_QUEUE_MAX_RETRIES=3

# Configurações PDF
PDF_TEMP_PATH=/tmp/pdfs
PDF_STORAGE_PATH=/storage/pdfs
PDF_MAX_SIZE_MB=10

# URLs da Aplicação
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Dados da Clínica (para PDFs fiscais)
CLINIC_CORPORATE_NAME=EO Clínica Ltda
CLINIC_CNPJ=12.345.678/0001-90
CLINIC_MUNICIPAL_REGISTRATION=123456789
CLINIC_ADDRESS=Rua das Flores, 123 - São Paulo/SP
CLINIC_PHONE=(11) 3456-7890
CLINIC_EMAIL=contato@eo-clinica.com.br
```

### **Configuração TypeScript**

```typescript
// src/modules/email/config/email.config.ts

export const emailConfig = {
  smtp: {
    host: process.env.EMAIL_SMTP_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  },
  templates: {
    path: process.env.EMAIL_TEMPLATES_PATH || '/src/modules/email/templates',
    assetsPath: process.env.EMAIL_ASSETS_PATH || '/public/email-assets',
  },
  defaults: {
    fromName: process.env.EMAIL_FROM_NAME || 'EO Clínica',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@eo-clinica.com.br',
  },
  clinic: {
    corporateName: process.env.CLINIC_CORPORATE_NAME,
    cnpj: process.env.CLINIC_CNPJ,
    municipalRegistration: process.env.CLINIC_MUNICIPAL_REGISTRATION,
    address: process.env.CLINIC_ADDRESS,
    phone: process.env.CLINIC_PHONE,
    email: process.env.CLINIC_EMAIL,
  },
  features: {
    taxDeduction: {
      enabled: true,
      monthlyReports: true,
      annualReports: true,
    },
    reminders: {
      enabled: true,
      timing: ['24h', '2h'], // Antes da consulta
    },
    queue: {
      concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5'),
      maxRetries: parseInt(process.env.EMAIL_QUEUE_MAX_RETRIES || '3'),
    },
  },
};
```

---

## 📋 TIPOS TYPESCRIPT COMPLETOS

```typescript
// src/modules/email/types/email.types.ts

export interface BaseEmailData {
  recipientName: string;
  recipientEmail: string;
  clinicName: string;
  clinicUrl: string;
  unsubscribeUrl: string;
  privacyPolicyUrl: string;
}

export interface DoctorRegistrationEmailData extends BaseEmailData {
  doctorName: string;
  crmNumber: string;
  specialty: string;
  platformUrl: string;
  trainingDate: string;
  loginCredentials: {
    email: string;
    temporaryPassword?: string;
  };
}

export interface PatientRegistrationEmailData extends BaseEmailData {
  patientName: string;
  cpf: string;
  phone: string;
  registrationDate: string;
  nextSteps: string[];
}

export interface TaxDeductionEmailData extends BaseEmailData {
  patientName: string;
  patientCpf: string;
  taxYear: number;
  totalAppointments: number;
  totalExams: number;
  totalDeductibleAmount: number;
  clinicCnpj: string;
  clinicPhone: string;
  appointments: TaxDeductionAppointment[];
  instructions: string[];
}

export interface TaxDeductionAppointment {
  id: string;
  date: Date;
  service: string;
  doctorName: string;
  doctorCrm: string;
  amount: number;
  specialty: string;
}

export interface AppointmentEmailData extends BaseEmailData {
  appointmentId: string;
  appointmentDate: Date;
  appointmentTime: string;
  doctorName: string;
  specialty: string;
  location: string;
  confirmationCode: string;
  cancelUrl: string;
  rescheduleUrl: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  requiredData: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  encoding?: string;
  cid?: string; // Para imagens inline
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  recipientEmail: string;
  templateUsed: string;
}

export interface EmailQueueJob {
  type: EmailJobType;
  data: any;
  priority: number;
  delay?: number;
  attempts: number;
}

export enum EmailJobType {
  DOCTOR_REGISTRATION = 'doctor-registration',
  PATIENT_REGISTRATION = 'patient-registration',
  APPOINTMENT_CONFIRMATION = 'appointment-confirmation',
  APPOINTMENT_REMINDER = 'appointment-reminder',
  APPOINTMENT_CANCELLATION = 'appointment-cancellation',
  TAX_DEDUCTION = 'tax-deduction',
  PAYMENT_RECEIPT = 'payment-receipt',
  SYSTEM_NOTIFICATION = 'system-notification',
}
```

---

## 🧪 TESTES E VALIDAÇÃO

### **Testes de Templates**

```typescript
// tests/email/email-templates.test.ts

describe('Email Templates', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  it('should render doctor registration template correctly', async () => {
    const data: DoctorRegistrationEmailData = {
      doctorName: 'Dr. João Silva',
      doctorEmail: 'dr.joao@email.com',
      crmNumber: 'CRM/SP 123456',
      specialty: 'Cardiologia',
      // ... outros dados
    };

    const html = await templateService.render('doctor-registration', data);
    
    expect(html).toContain('Dr. João Silva');
    expect(html).toContain('CRM/SP 123456');
    expect(html).toContain('Cardiologia');
  });

  it('should generate tax deduction PDF correctly', async () => {
    const taxData: TaxDeductionData = {
      patientName: 'Maria Santos',
      patientCpf: '123.456.789-00',
      taxYear: 2024,
      totalAmount: 1500.00,
      // ... outros dados
    };

    const pdfService = new PDFGeneratorService();
    const attachment = await pdfService.generateTaxDeductionPDF(taxData);
    
    expect(attachment.filename).toMatch(/comprovante-fiscal-2024-\d+\.pdf/);
    expect(attachment.contentType).toBe('application/pdf');
    expect(attachment.content).toBeInstanceOf(Buffer);
  });
});
```

### **Testes de Integração**

```typescript
// tests/email/email-integration.test.ts

describe('Email Integration', () => {
  let emailService: EmailService;
  let mockSMTP: any;

  beforeEach(() => {
    mockSMTP = createMockSMTPTransporter();
    emailService = new EmailService(mockSMTP);
  });

  it('should send doctor registration email on user creation', async () => {
    const doctorData = {
      name: 'Dr. Test',
      email: 'dr.test@email.com',
      crm: '123456',
      specialty: 'Cardiologia'
    };

    await userService.createDoctor(doctorData);

    expect(mockSMTP.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dr.test@email.com',
        subject: expect.stringContaining('Bem-vindo'),
      })
    );
  });

  it('should generate and send tax deduction email', async () => {
    const patientId = 'patient-123';
    const taxYear = 2024;

    const result = await emailService.sendTaxDeductionEmail(patientId, taxYear);

    expect(result).toBe(true);
    expect(mockSMTP.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Comprovante Fiscal'),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringMatching(/comprovante-fiscal-.*\.pdf/),
            contentType: 'application/pdf'
          })
        ])
      })
    );
  });
});
```

---

## 📈 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Fase 1: Infraestrutura Base (2-3 semanas)**
- [ ] Configuração do sistema de templates (Handlebars)
- [ ] Integração SMTP (Nodemailer)
- [ ] Sistema de filas (Bull + Redis)
- [ ] Configuração de ambiente
- [ ] Templates base (header, footer, layout)

### **Fase 2: Templates e PDFs (2-3 semanas)**
- [ ] Template: Cadastro de médico
- [ ] Template: Cadastro de paciente  
- [ ] Template: Confirmação de consulta
- [ ] Template: Lembretes
- [ ] **Template: Dedução IR (PRIORIDADE)**
- [ ] Gerador de PDF fiscal
- [ ] Sistema de anexos

### **Fase 3: Integração com Sistema (2 semanas)**
- [ ] Hooks em UserService
- [ ] Hooks em AppointmentService
- [ ] Hooks em FinancialService
- [ ] Sistema de agendamento de emails
- [ ] Processamento de filas

### **Fase 4: Funcionalidades Avançadas (1-2 semanas)**
- [ ] Relatórios fiscais mensais/anuais
- [ ] Sistema de preferências de email
- [ ] Unsubscribe automático
- [ ] Analytics de entrega
- [ ] Monitoramento de performance

### **Fase 5: Testes e Deploy (1 semana)**
- [ ] Testes unitários completos
- [ ] Testes de integração
- [ ] Testes de stress (envio em massa)
- [ ] Documentação final
- [ ] Deploy em produção

---

## 🔒 SEGURANÇA E CONFORMIDADE

### **Proteção de Dados**
- **Criptografia**: Dados sensíveis criptografados em trânsito e repouso
- **LGPD**: Logs de auditoria para todos os envios
- **Opt-out**: Sistema de cancelamento de notificações
- **Retenção**: Política de retenção de logs e dados

### **Segurança SMTP**
- **TLS**: Conexão criptografada obrigatória
- **Autenticação**: SMTP com autenticação segura
- **Rate Limiting**: Limitação de envios por hora
- **Blacklist**: Sistema de prevenção de spam

### **Auditoria LGPD**
```typescript
interface EmailAuditLog {
  id: string;
  userId: string;
  emailType: string;
  recipient: string;
  sentAt: Date;
  templateUsed: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### **KPIs de Email**
- **Taxa de Entrega**: > 95%
- **Taxa de Abertura**: > 40%
- **Taxa de Clique**: > 15%
- **Taxa de Falha**: < 2%
- **Tempo de Processamento**: < 30 segundos

### **Monitoramento Técnico**
- **Fila de Emails**: Tamanho, processamento, falhas
- **Performance SMTP**: Tempo de resposta, conexões
- **Storage**: Uso de disco para PDFs temporários
- **Memory**: Consumo de memória do gerador PDF

### **Alertas Automáticos**
- **Fila Travada**: > 100 emails pendentes por 10 min
- **Taxa de Falha Alta**: > 5% de falhas em 1 hora
- **SMTP Offline**: Falha de conexão SMTP
- **Disk Space**: < 1GB disponível para PDFs

---

## 🎯 RESULTADO ESPERADO

### **Para Médicos**
- Email profissional de boas-vindas com credenciais
- Instruções claras sobre a plataforma
- Cronograma de treinamento
- Manual em PDF anexado

### **Para Pacientes**
- Confirmação de cadastro amigável
- Orientações sobre o uso da plataforma
- Políticas de privacidade LGPD
- Cartilha do paciente em PDF

### **Para IR/Fiscal**
- **PDF completo com todos os dados necessários**
- **Instruções detalhadas para declaração**
- **Relatório mensal automático**
- **Relatório anual consolidado**
- **CNPJ, valores, datas - tudo organizado**

### **Para Sistema**
- **100% de entrega garantida**
- **Logs completos para auditoria**
- **Performance otimizada**
- **Escalabilidade para milhares de emails**
- **Conformidade total com LGPD**

---

**📧 Sistema de Email EO Clínica**  
**Status**: Plano Completo de Implementação  
**Prioridade**: Dedução IR + Cadastros  
**Templates**: Profissionais sem emojis  
**Compliance**: 100% LGPD  
**Anexos**: PDFs fiscais completos  
**Timeline**: 8-10 semanas implementação total

*Plano criado em: 22 de agosto de 2025*