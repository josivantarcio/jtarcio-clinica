# PROMPT SETOR 6: SEGURANÇA, LGPD E COMPLIANCE
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO FINAL
Este é o sexto e último setor. Toda a aplicação já está desenvolvida: backend, IA, core system, automação N8N e frontend. Agora implementaremos a camada crítica de segurança, conformidade com LGPD, auditoria completa e compliance para o setor de saúde.

### OBJETIVO ESPECÍFICO DESTE SETOR
Implementar segurança robusta em todas as camadas, conformidade total com LGPD, auditoria completa, compliance médico (CFM, ANVISA) e preparar o sistema para certificações de segurança.

### ESCOPO DESTE SETOR

#### 1. SEGURANÇA MULTICAMADA
- **Authentication & Authorization**: JWT, OAuth2, MFA
- **Data Encryption**: Rest, Transit, Application Level
- **API Security**: Rate limiting, CORS, Input validation
- **Infrastructure Security**: WAF, DDoS protection, VPN
- **Application Security**: OWASP compliance, Security headers

#### 2. LGPD COMPLIANCE COMPLETA
- **Data Mapping**: Inventário completo de dados pessoais
- **Consent Management**: Sistema de consentimento granular
- **Data Subject Rights**: Portabilidade, correção, exclusão
- **Privacy by Design**: Implementação desde o design
- **DPO Tools**: Ferramentas para encarregado de dados

#### 3. AUDITORIA E LOGGING
- **Audit Trail**: Rastreamento completo de ações
- **Security Monitoring**: Detecção de anomalias
- **Compliance Reports**: Relatórios automáticos
- **Incident Response**: Procedimentos de resposta
- **Forensic Capability**: Capacidade forense

#### 4. COMPLIANCE MÉDICO
- **CFM Compliance**: Adequação ao Conselho Federal de Medicina
- **ANVISA**: Conformidade regulatória
- **Medical Data Security**: Proteção especial de dados médicos
- **Professional Ethics**: Código de ética médica
- **Data Retention**: Políticas de retenção médica

### IMPLEMENTAÇÃO DE SEGURANÇA

#### 1. AUTHENTICATION SYSTEM
```typescript
interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshTokenExpiry: string;
    algorithm: 'HS256' | 'RS256';
  };
  
  oauth2: {
    google: OAuth2Config;
    microsoft: OAuth2Config;
    apple: OAuth2Config;
  };
  
  mfa: {
    enabled: boolean;
    methods: ('sms' | 'email' | 'totp' | 'webauthn')[];
    required: boolean;
  };
  
  session: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
}

// Multi-Factor Authentication
class MFAService {
  async enableTOTP(userId: string): Promise<TOTPSetup> {
    const secret = generateTOTPSecret();
    const qrCode = await generateQRCode(secret, userId);
    
    // Store encrypted secret
    await this.storeMFASecret(userId, encrypt(secret));
    
    return {
      secret: secret,
      qrCode: qrCode,
      backupCodes: generateBackupCodes()
    };
  }
  
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const encryptedSecret = await this.getMFASecret(userId);
    const secret = decrypt(encryptedSecret);
    
    return verifyTOTPToken(token, secret);
  }
  
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    const code = generateSMSCode();
    
    // Store with expiry
    await this.storeSMSCode(userId, code, 300); // 5 min expiry
    
    // Send via secure SMS provider
    await this.smsProvider.send(phoneNumber, `Código: ${code}`);
    
    // Log for audit
    await this.auditLogger.log('mfa_sms_sent', { userId, phoneNumber: mask(phoneNumber) });
  }
}
```

#### 2. DATA ENCRYPTION SYSTEM
```typescript
interface EncryptionService {
  // Field-level encryption for sensitive data
  encryptPII(data: string): Promise<string>;
  decryptPII(encryptedData: string): Promise<string>;
  
  // Medical data encryption (stronger)
  encryptMedicalData(data: MedicalRecord): Promise<string>;
  decryptMedicalData(encryptedData: string): Promise<MedicalRecord>;
  
  // File encryption for documents
  encryptFile(file: Buffer): Promise<EncryptedFile>;
  decryptFile(encryptedFile: EncryptedFile): Promise<Buffer>;
}

class DataEncryption implements EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'pbkdf2';
  
  async encryptPII(data: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await this.deriveKey(process.env.MASTER_KEY!, salt);
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('pii-data'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    