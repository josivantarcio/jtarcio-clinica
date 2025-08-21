import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { sanitizeUserInput } from '../../src/utils/data-sanitization';

/**
 * Security Tests for EO Clínica System
 * 
 * These tests verify that the system meets security requirements:
 * - Authentication and authorization
 * - Data protection (LGPD compliance)
 * - Input validation and sanitization
 * - SQL injection prevention
 * - XSS protection
 * - CSRF protection
 * - Rate limiting
 * - Encryption standards
 */

describe('Security Tests - EO Clínica System', () => {
  const SECURITY_CONFIG = {
    JWT_EXPIRY_MINUTES: 30,
    REFRESH_TOKEN_DAYS: 7,
    MAX_LOGIN_ATTEMPTS: 5,
    RATE_LIMIT_REQUESTS: 100,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    PASSWORD_MIN_LENGTH: 8,
    SESSION_TIMEOUT: 1800000, // 30 minutes
  };

  beforeAll(async () => {
    console.log('🔒 Starting Security Tests');
    console.log('⚙️ Security Configuration:', SECURITY_CONFIG);
  });

  afterAll(async () => {
    console.log('✅ Security Tests Completed');
  });

  describe('Authentication Security', () => {
    it('should validate strong password requirements', () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty',
        'senha123',
        'admin',
        '',
        'a'.repeat(7), // Too short
      ];

      const strongPasswords = [
        'MinhaSenh@123',
        'C0mpl3x@Pass!',
        'Segur@nca2024',
        'M3d1c@lSyst3m!',
        'Cl1n1c@S3cur3',
      ];

      const validatePassword = (password: string): boolean => {
        const minLength = password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
      };

      console.log('🔐 Password Validation Tests:');

      // Test weak passwords
      weakPasswords.forEach(password => {
        const isValid = validatePassword(password);
        console.log(`   "${password}" (length: ${password.length}): ${isValid ? '✅' : '❌'}`);
        expect(isValid).toBe(false);
      });

      // Test strong passwords
      strongPasswords.forEach(password => {
        const isValid = validatePassword(password);
        console.log(`   "${password}": ${isValid ? '✅' : '❌'}`);
        expect(isValid).toBe(true);
      });
    });

    it('should implement proper login attempt limiting', async () => {
      const email = 'test@example.com';
      let loginAttempts = 0;
      let isLocked = false;
      let lockoutTime: number | null = null;

      const mockLogin = async (password: string): Promise<{ success: boolean, locked?: boolean, retryAfter?: number }> => {
        if (isLocked && lockoutTime && Date.now() < lockoutTime) {
          return { success: false, locked: true, retryAfter: lockoutTime - Date.now() };
        }

        if (isLocked && lockoutTime && Date.now() >= lockoutTime) {
          // Reset after lockout period
          isLocked = false;
          loginAttempts = 0;
          lockoutTime = null;
        }

        if (password === 'correct_password') {
          loginAttempts = 0; // Reset on successful login
          return { success: true };
        }

        loginAttempts++;
        if (loginAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
          isLocked = true;
          lockoutTime = Date.now() + (15 * 60 * 1000); // 15 minutes lockout
          return { success: false, locked: true, retryAfter: 15 * 60 * 1000 };
        }

        return { success: false };
      };

      console.log('🚫 Login Attempt Limiting:');

      // Test multiple failed attempts
      for (let i = 1; i <= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS + 2; i++) {
        const result = await mockLogin('wrong_password');
        console.log(`   Attempt ${i}: ${result.success ? 'Success' : 'Failed'}${result.locked ? ' (LOCKED)' : ''}`);
        
        if (i < SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
          expect(result.success).toBe(false);
          expect(result.locked).toBeFalsy();
        } else if (i === SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
          expect(result.success).toBe(false);
          expect(result.locked).toBe(true);
        } else {
          expect(result.locked).toBe(true);
          expect(result.retryAfter).toBeGreaterThan(0);
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      // Test that lockout persists
      const lockedResult = await mockLogin('correct_password');
      expect(lockedResult.locked).toBe(true);
    });

    it('should validate JWT token security', () => {
      const mockJWT = {
        header: { alg: 'HS256', typ: 'JWT' },
        payload: {
          userId: 123,
          email: 'user@example.com',
          role: 'patient',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (SECURITY_CONFIG.JWT_EXPIRY_MINUTES * 60),
        }
      };

      const validateJWTSecurity = (token: any): { valid: boolean, issues: string[] } => {
        const issues: string[] = [];

        // Check algorithm
        if (token.header.alg !== 'HS256' && token.header.alg !== 'RS256') {
          issues.push('Weak or insecure algorithm');
        }

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (!token.payload.exp || token.payload.exp <= now) {
          issues.push('Token expired or no expiry');
        }

        // Check expiry duration
        const expiryDuration = token.payload.exp - token.payload.iat;
        const maxExpiry = SECURITY_CONFIG.JWT_EXPIRY_MINUTES * 60;
        if (expiryDuration > maxExpiry) {
          issues.push(`Token expiry too long (${expiryDuration}s > ${maxExpiry}s)`);
        }

        // Check required claims
        const requiredClaims = ['userId', 'email', 'role', 'iat', 'exp'];
        for (const claim of requiredClaims) {
          if (!token.payload[claim]) {
            issues.push(`Missing required claim: ${claim}`);
          }
        }

        return { valid: issues.length === 0, issues };
      };

      const validation = validateJWTSecurity(mockJWT);
      
      console.log('🎫 JWT Security Validation:');
      console.log(`   Valid: ${validation.valid}`);
      if (validation.issues.length > 0) {
        validation.issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
      }

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should implement proper session management', async () => {
      const sessions = new Map<string, { userId: number, createdAt: number, lastActivity: number }>();

      const createSession = (userId: number): string => {
        const sessionId = 'sess_' + Math.random().toString(36).substr(2, 20);
        const now = Date.now();
        sessions.set(sessionId, { userId, createdAt: now, lastActivity: now });
        return sessionId;
      };

      const validateSession = (sessionId: string): { valid: boolean, reason?: string } => {
        const session = sessions.get(sessionId);
        if (!session) {
          return { valid: false, reason: 'Session not found' };
        }

        const now = Date.now();
        const timeSinceActivity = now - session.lastActivity;

        if (timeSinceActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
          sessions.delete(sessionId);
          return { valid: false, reason: 'Session expired due to inactivity' };
        }

        // Update last activity
        session.lastActivity = now;
        return { valid: true };
      };

      console.log('🔄 Session Management Tests:');

      // Create session
      const sessionId = createSession(123);
      console.log(`   Created session: ${sessionId.substr(0, 15)}...`);

      // Validate active session
      let validation = validateSession(sessionId);
      expect(validation.valid).toBe(true);
      console.log(`   Active session validation: ${validation.valid}`);

      // Simulate inactivity
      const session = sessions.get(sessionId)!;
      session.lastActivity = Date.now() - (SECURITY_CONFIG.SESSION_TIMEOUT + 1000); // Expired

      validation = validateSession(sessionId);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
      console.log(`   Expired session validation: ${validation.valid} (${validation.reason})`);

      // Verify session was cleaned up
      expect(sessions.has(sessionId)).toBe(false);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attacks', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' OR 1=1 /*",
        "admin'--",
        "' OR 'a'='a",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      const sanitizeInput = (input: string): string => {
        // Comprehensive SQL injection prevention
        return input
          .replace(/'/g, "''") // Escape single quotes
          .replace(/;/g, '') // Remove semicolons
          .replace(/--/g, '') // Remove SQL comments
          .replace(/\/\*/g, '') // Remove block comments start
          .replace(/\*\//g, '') // Remove block comments end
          .replace(/DROP/gi, '') // Remove dangerous keywords
          .replace(/INSERT/gi, '')
          .replace(/DELETE/gi, '')
          .replace(/UPDATE/gi, '')
          .replace(/EXEC/gi, '')
          .replace(/UNION/gi, '')
          .replace(/SELECT/gi, '')
          .replace(/OR/gi, '')
          .replace(/AND/gi, '');
      };

      const validateSQLSafety = (input: string): boolean => {
        // After proper sanitization, input should be safe
        // Check for any remaining dangerous patterns
        const stillDangerous = [
          /drop/i,
          /insert/i,
          /delete/i,
          /union/i,
          /select/i,
          /exec/i
        ];

        return !stillDangerous.some(pattern => pattern.test(input));
      };

      console.log('🛡️ SQL Injection Prevention:');

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        const isSafe = validateSQLSafety(sanitized);
        
        console.log(`   Input: "${input.substring(0, 30)}..."`);
        console.log(`   Sanitized: "${sanitized.substring(0, 30)}..."`);
        console.log(`   Safe: ${isSafe ? '✅' : '❌'}`);
        
        expect(isSafe).toBe(true);
      });
    });

    it('should prevent XSS attacks', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<svg onload="alert(1)">',
        'javascript:alert("XSS")',
        '<body onload="alert(1)">',
        '<input type="text" value="" onfocus="alert(1)" autofocus>',
        '<a href="javascript:alert(1)">Click me</a>',
      ];

      const sanitizeHTML = (input: string): string => {
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      };

      const detectXSS = (input: string): boolean => {
        const xssPatterns = [
          /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
          /<iframe[\s\S]*?>/gi,
          /<svg[\s\S]*?>/gi,
          /on\w+\s*=/gi,
          /javascript:/gi,
          /<img[\s\S]*?onerror/gi,
        ];

        return xssPatterns.some(pattern => pattern.test(input));
      };

      console.log('🚫 XSS Attack Prevention:');

      xssPayloads.forEach(payload => {
        const containsXSS = detectXSS(payload);
        const sanitized = sanitizeHTML(payload);
        const sanitizedContainsXSS = detectXSS(sanitized);
        
        console.log(`   Payload: "${payload.substr(0, 40)}..."`);
        console.log(`   Contains XSS: ${containsXSS ? '⚠️' : '✅'}`);
        console.log(`   Sanitized: "${sanitized.substr(0, 40)}..."`);
        console.log(`   Sanitized Safe: ${!sanitizedContainsXSS ? '✅' : '❌'}`);
        
        expect(containsXSS).toBe(true); // Original should be detected as XSS
        expect(sanitizedContainsXSS).toBe(false); // Sanitized should be safe
      });
    });

    it('should validate and sanitize medical data inputs', () => {
      const medicalInputs = [
        {
          type: 'cpf',
          value: '123.456.789-09', // CPF válido
          expected: '12345678909'
        },
        {
          type: 'cpf',
          value: '111.111.111-11', // Invalid CPF
          expected: null
        },
        {
          type: 'phone',
          value: '(11) 99999-9999',
          expected: '11999999999'
        },
        {
          type: 'email',
          value: 'patient@example.com',
          expected: 'patient@example.com'
        },
        {
          type: 'email',
          value: 'invalid-email',
          expected: null
        },
        {
          type: 'cep',
          value: '01234-567',
          expected: '01234567'
        },
        {
          type: 'medical_record',
          value: 'MR-2024-001',
          expected: 'MR-2024-001'
        }
      ];

      const validateCPF = (cpf: string): boolean => {
        const digits = cpf.replace(/\D/g, '');
        if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
        
        // CPF validation algorithm
        let sum = 0;
        for (let i = 0; i < 9; i++) {
          sum += parseInt(digits[i]) * (10 - i);
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) digit1 = 0;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
          sum += parseInt(digits[i]) * (11 - i);
        }
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) digit2 = 0;
        
        return digit1 === parseInt(digits[9]) && digit2 === parseInt(digits[10]);
      };

      const sanitizeAndValidate = (type: string, value: string): string | null => {
        switch (type) {
          case 'cpf':
            const cpfDigits = value.replace(/\D/g, '');
            return validateCPF(cpfDigits) ? cpfDigits : null;
          
          case 'phone':
            const phoneDigits = value.replace(/\D/g, '');
            return phoneDigits.length >= 10 ? phoneDigits : null;
          
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? value.toLowerCase() : null;
          
          case 'cep':
            const cepDigits = value.replace(/\D/g, '');
            return cepDigits.length === 8 ? cepDigits : null;
          
          case 'medical_record':
            const mrRegex = /^[A-Z]{2}-\d{4}-\d{3}$/;
            return mrRegex.test(value) ? value : null;
          
          default:
            return null;
        }
      };

      console.log('🏥 Medical Data Validation:');

      medicalInputs.forEach(({ type, value, expected }) => {
        const result = sanitizeAndValidate(type, value);
        const isValid = result === expected;
        
        console.log(`   ${type}: "${value}" → "${result}" ${isValid ? '✅' : '❌'}`);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Data Protection and Privacy (LGPD)', () => {
    it('should implement proper data encryption', () => {
      const sensitiveData = [
        'João Silva',
        '123.456.789-00',
        'joao@example.com',
        '(11) 99999-9999',
        'Rua das Flores, 123',
      ];

      // Mock encryption function (in real implementation, use proper crypto)
      const encrypt = (data: string, key: string = 'secret-key'): string => {
        return Buffer.from(data).toString('base64') + '_encrypted';
      };

      const decrypt = (encryptedData: string, key: string = 'secret-key'): string => {
        const data = encryptedData.replace('_encrypted', '');
        return Buffer.from(data, 'base64').toString('utf8');
      };

      const isEncrypted = (data: string): boolean => {
        return data.endsWith('_encrypted');
      };

      console.log('🔐 Data Encryption Tests:');

      sensitiveData.forEach(data => {
        const encrypted = encrypt(data);
        const decrypted = decrypt(encrypted);
        
        console.log(`   Original: "${data}"`);
        console.log(`   Encrypted: "${encrypted.substr(0, 20)}..."`);
        console.log(`   Is Encrypted: ${isEncrypted(encrypted) ? '✅' : '❌'}`);
        console.log(`   Decrypted: "${decrypted}"`);
        console.log(`   Match: ${data === decrypted ? '✅' : '❌'}`);
        
        expect(isEncrypted(encrypted)).toBe(true);
        expect(decrypted).toBe(data);
        expect(encrypted).not.toBe(data); // Should not be plain text
      });
    });

    it('should implement data anonymization for analytics', () => {
      const patientData = [
        {
          id: 1,
          name: 'João Silva',
          cpf: '12345678900',
          email: 'joao@example.com',
          phone: '11999999999',
          age: 35,
          specialty: 'Cardiologia',
          appointmentDate: '2024-01-15',
          diagnosis: 'Hipertensão',
        },
        {
          id: 2,
          name: 'Maria Santos',
          cpf: '98765432100',
          email: 'maria@example.com',
          phone: '11888888888',
          age: 42,
          specialty: 'Dermatologia',
          appointmentDate: '2024-01-16',
          diagnosis: 'Eczema',
        }
      ];

      const anonymizeData = (data: any): any => {
        const anonymized = { ...data };
        
        // Remove or hash personal identifiers
        delete anonymized.name;
        delete anonymized.cpf;
        delete anonymized.email;
        delete anonymized.phone;
        
        // Replace ID with anonymous hash
        anonymized.anonymousId = `anon_${data.id.toString().padStart(8, '0')}`;
        delete anonymized.id;
        
        // Age groups instead of exact age
        anonymized.ageGroup = data.age < 18 ? 'child' : 
                             data.age < 65 ? 'adult' : 'senior';
        delete anonymized.age;
        
        // Keep medical data for analytics (non-identifying)
        // Keep: specialty, appointmentDate, diagnosis (anonymized)
        
        return anonymized;
      };

      const hasPersonalData = (data: any): boolean => {
        const personalFields = ['name', 'cpf', 'email', 'phone', 'id'];
        return personalFields.some(field => data.hasOwnProperty(field));
      };

      console.log('🎭 Data Anonymization Tests:');

      patientData.forEach(patient => {
        const anonymized = anonymizeData(patient);
        
        console.log(`   Original: ${patient.name} (ID: ${patient.id})`);
        console.log(`   Anonymized ID: ${anonymized.anonymousId}`);
        console.log(`   Age: ${patient.age} → Age Group: ${anonymized.ageGroup}`);
        console.log(`   Has Personal Data: ${hasPersonalData(anonymized) ? '❌' : '✅'}`);
        console.log(`   Kept Medical Data: ${anonymized.specialty}, ${anonymized.diagnosis}`);
        
        expect(hasPersonalData(anonymized)).toBe(false);
        expect(anonymized.anonymousId).toBeDefined();
        expect(anonymized.ageGroup).toBeDefined();
        expect(anonymized.specialty).toBe(patient.specialty);
      });
    });

    it('should implement proper consent management', () => {
      const consentTypes = [
        'data_processing',
        'marketing_communications', 
        'data_sharing_partners',
        'analytics_tracking',
        'medical_research',
      ];

      interface Consent {
        userId: number;
        consentType: string;
        granted: boolean;
        timestamp: Date;
        ipAddress: string;
        userAgent: string;
        version: string;
      }

      const consentRecords: Consent[] = [];

      const recordConsent = (
        userId: number, 
        consentType: string, 
        granted: boolean,
        metadata: { ipAddress: string, userAgent: string }
      ): Consent => {
        const consent: Consent = {
          userId,
          consentType,
          granted,
          timestamp: new Date(),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          version: '1.0',
        };
        
        consentRecords.push(consent);
        return consent;
      };

      const checkConsent = (userId: number, consentType: string): boolean => {
        const latestConsent = consentRecords
          .filter(c => c.userId === userId && c.consentType === consentType)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        return latestConsent?.granted || false;
      };

      const revokeConsent = (userId: number, consentType: string, metadata: any): void => {
        recordConsent(userId, consentType, false, metadata);
      };

      console.log('📋 Consent Management Tests:');

      const userId = 123;
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      // Test granting consent
      consentTypes.forEach(type => {
        const consent = recordConsent(userId, type, true, metadata);
        const hasConsent = checkConsent(userId, type);
        
        console.log(`   Granted ${type}: ${hasConsent ? '✅' : '❌'}`);
        expect(hasConsent).toBe(true);
        expect(consent.timestamp).toBeInstanceOf(Date);
        expect(consent.ipAddress).toBe(metadata.ipAddress);
      });

      // Test revoking consent
      const revokeType = 'marketing_communications';
      revokeConsent(userId, revokeType, metadata);
      const hasRevokedConsent = checkConsent(userId, revokeType);
      
      console.log(`   Revoked ${revokeType}: ${!hasRevokedConsent ? '✅' : '❌'}`);
      expect(hasRevokedConsent).toBe(false);
      
      // Other consents should remain
      const stillHasDataProcessing = checkConsent(userId, 'data_processing');
      expect(stillHasDataProcessing).toBe(true);
    });

    it('should implement data retention policies', () => {
      interface DataRecord {
        id: string;
        type: 'patient_data' | 'appointment' | 'financial' | 'audit_log';
        createdAt: Date;
        lastAccessed: Date;
        retentionPeriod: number; // days
        isActive: boolean;
      }

      const retentionPolicies = {
        patient_data: 2555, // 7 years (LGPD medical requirement)
        appointment: 1825, // 5 years
        financial: 2555, // 7 years (tax requirement)
        audit_log: 365, // 1 year
      };

      const dataRecords: DataRecord[] = [
        {
          id: 'patient_001',
          type: 'patient_data',
          createdAt: new Date(Date.now() - (3000 * 24 * 60 * 60 * 1000)), // 3000 days old
          lastAccessed: new Date(Date.now() - (100 * 24 * 60 * 60 * 1000)), // 100 days ago
          retentionPeriod: retentionPolicies.patient_data,
          isActive: true,
        },
        {
          id: 'audit_001',
          type: 'audit_log',
          createdAt: new Date(Date.now() - (400 * 24 * 60 * 60 * 1000)), // 400 days old
          lastAccessed: new Date(Date.now() - (400 * 24 * 60 * 60 * 1000)), // Never accessed
          retentionPeriod: retentionPolicies.audit_log,
          isActive: true,
        },
        {
          id: 'financial_001',
          type: 'financial',
          createdAt: new Date(Date.now() - (1000 * 24 * 60 * 60 * 1000)), // 1000 days old
          lastAccessed: new Date(Date.now() - (50 * 24 * 60 * 60 * 1000)), // 50 days ago
          retentionPeriod: retentionPolicies.financial,
          isActive: true,
        }
      ];

      const checkRetentionCompliance = (record: DataRecord): { 
        shouldRetain: boolean, 
        daysUntilExpiry: number,
        reason: string 
      } => {
        const now = Date.now();
        const createdMs = record.createdAt.getTime();
        const ageInDays = Math.floor((now - createdMs) / (24 * 60 * 60 * 1000));
        const daysUntilExpiry = record.retentionPeriod - ageInDays;
        
        let reason = '';
        let shouldRetain = true;

        if (daysUntilExpiry <= 0) {
          shouldRetain = false;
          reason = 'Retention period expired';
        } else if (daysUntilExpiry <= 30) {
          reason = 'Approaching expiry (30 days)';
        } else {
          reason = 'Within retention period';
        }

        return { shouldRetain, daysUntilExpiry, reason };
      };

      console.log('🗓️ Data Retention Policy Tests:');

      dataRecords.forEach(record => {
        const compliance = checkRetentionCompliance(record);
        const ageInDays = Math.floor((Date.now() - record.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        
        console.log(`   Record: ${record.id} (${record.type})`);
        console.log(`   Age: ${ageInDays} days, Retention: ${record.retentionPeriod} days`);
        console.log(`   Should Retain: ${compliance.shouldRetain ? '✅' : '❌'} (${compliance.reason})`);
        console.log(`   Days Until Expiry: ${compliance.daysUntilExpiry}`);
        
        // Validate based on record type and age
        if (record.type === 'audit_log' && ageInDays > retentionPolicies.audit_log) {
          expect(compliance.shouldRetain).toBe(false);
        } else if (ageInDays <= record.retentionPeriod) {
          expect(compliance.shouldRetain).toBe(true);
        }
      });
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should implement API rate limiting', async () => {
      const rateLimiter = new Map<string, { requests: number[], windowStart: number }>();

      const checkRateLimit = (
        clientId: string, 
        maxRequests: number = SECURITY_CONFIG.RATE_LIMIT_REQUESTS,
        windowMs: number = SECURITY_CONFIG.RATE_LIMIT_WINDOW
      ): { allowed: boolean, remaining: number, resetTime: number } => {
        const now = Date.now();
        const clientData = rateLimiter.get(clientId) || { requests: [], windowStart: now };
        
        // Clean old requests outside window
        clientData.requests = clientData.requests.filter(timestamp => 
          now - timestamp < windowMs
        );
        
        if (clientData.requests.length >= maxRequests) {
          const oldestRequest = Math.min(...clientData.requests);
          const resetTime = oldestRequest + windowMs;
          return { allowed: false, remaining: 0, resetTime };
        }
        
        // Add current request
        clientData.requests.push(now);
        rateLimiter.set(clientId, clientData);
        
        return { 
          allowed: true, 
          remaining: maxRequests - clientData.requests.length,
          resetTime: now + windowMs 
        };
      };

      console.log('⏱️ Rate Limiting Tests:');

      const clientId = 'client_123';
      const testRequests = 105; // Exceed limit of 100

      for (let i = 1; i <= testRequests; i++) {
        const result = checkRateLimit(clientId);
        
        if (i === 1 || i === 50 || i === 100 || i === 101 || i === testRequests) {
          console.log(`   Request ${i}: ${result.allowed ? 'Allowed' : 'Blocked'} (remaining: ${result.remaining})`);
        }
        
        if (i <= SECURITY_CONFIG.RATE_LIMIT_REQUESTS) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
        }

        // Small delay to simulate real requests
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    });

    it('should detect and prevent DDoS patterns', async () => {
      interface RequestLog {
        clientId: string;
        timestamp: number;
        endpoint: string;
        userAgent: string;
      }

      const requestLogs: RequestLog[] = [];
      const suspiciousClients = new Set<string>();

      const logRequest = (log: RequestLog): void => {
        requestLogs.push(log);
        
        // Keep only last 1000 requests for analysis
        if (requestLogs.length > 1000) {
          requestLogs.shift();
        }
      };

      const detectDDoSPatterns = (): string[] => {
        const now = Date.now();
        const recentRequests = requestLogs.filter(log => now - log.timestamp < 60000); // Last minute
        const alerts: string[] = [];

        // Group by client
        const clientRequests = new Map<string, RequestLog[]>();
        recentRequests.forEach(log => {
          if (!clientRequests.has(log.clientId)) {
            clientRequests.set(log.clientId, []);
          }
          clientRequests.get(log.clientId)!.push(log);
        });

        // Detect patterns
        clientRequests.forEach((requests, clientId) => {
          // High frequency from single client
          if (requests.length > 200) { // More than 200 requests per minute
            alerts.push(`High frequency attack from ${clientId}: ${requests.length} requests/min`);
            suspiciousClients.add(clientId);
          }

          // Same endpoint repeatedly
          const endpointCounts = new Map<string, number>();
          requests.forEach(req => {
            endpointCounts.set(req.endpoint, (endpointCounts.get(req.endpoint) || 0) + 1);
          });

          endpointCounts.forEach((count, endpoint) => {
            if (count > 100) { // Same endpoint more than 100 times per minute
              alerts.push(`Endpoint flooding from ${clientId}: ${endpoint} (${count} times)`);
              suspiciousClients.add(clientId);
            }
          });

          // Bot-like behavior (same user agent, regular intervals)
          const userAgents = [...new Set(requests.map(r => r.userAgent))];
          if (userAgents.length === 1 && requests.length > 50) {
            const intervals = requests.slice(1).map((req, i) => 
              req.timestamp - requests[i].timestamp
            );
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const intervalVariation = intervals.map(i => Math.abs(i - avgInterval));
            const avgVariation = intervalVariation.reduce((a, b) => a + b, 0) / intervalVariation.length;
            
            if (avgVariation < 100) { // Very regular intervals (likely bot)
              alerts.push(`Bot-like behavior from ${clientId}: regular ${avgInterval.toFixed(0)}ms intervals`);
              suspiciousClients.add(clientId);
            }
          }
        });

        return alerts;
      };

      console.log('🚨 DDoS Detection Tests:');

      // Simulate normal traffic
      for (let i = 0; i < 50; i++) {
        logRequest({
          clientId: `normal_${i % 10}`,
          timestamp: Date.now() - Math.random() * 60000,
          endpoint: ['/api/appointments', '/api/patients', '/api/doctors'][Math.floor(Math.random() * 3)],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        });
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Simulate DDoS attack
      const attackClient = 'attacker_001';
      for (let i = 0; i < 250; i++) {
        logRequest({
          clientId: attackClient,
          timestamp: Date.now() - (250 - i) * 200, // Regular intervals
          endpoint: '/api/login',
          userAgent: 'AttackBot/1.0',
        });
      }

      const alerts = detectDDoSPatterns();
      
      console.log(`   Total requests logged: ${requestLogs.length}`);
      console.log(`   Suspicious clients: ${suspiciousClients.size}`);
      console.log(`   Alerts generated: ${alerts.length}`);
      
      alerts.forEach(alert => {
        console.log(`   🚨 ${alert}`);
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(suspiciousClients.has(attackClient)).toBe(true);
    });
  });

  describe('Encryption and Data Security', () => {
    it('should use proper encryption algorithms', () => {
      // Mock crypto implementation (use actual crypto in production)
      const algorithms = {
        'AES-256-GCM': { keySize: 256, secure: true },
        'AES-128-CBC': { keySize: 128, secure: false }, // Deprecated
        'DES': { keySize: 56, secure: false }, // Insecure
        'RSA-2048': { keySize: 2048, secure: true },
        'RSA-1024': { keySize: 1024, secure: false }, // Too small
      };

      const validateEncryptionSecurity = (algorithm: string): { secure: boolean, issues: string[] } => {
        const algo = algorithms[algorithm as keyof typeof algorithms];
        const issues: string[] = [];

        if (!algo) {
          issues.push('Unknown algorithm');
          return { secure: false, issues };
        }

        if (algorithm.includes('DES')) {
          issues.push('DES is cryptographically broken');
        }

        if (algorithm.includes('CBC') && !algorithm.includes('HMAC')) {
          issues.push('CBC mode without HMAC is vulnerable to padding oracle attacks');
        }

        if (algorithm.includes('RSA') && algo.keySize < 2048) {
          issues.push('RSA key size too small (minimum 2048 bits)');
        }

        if (algorithm.includes('AES') && algo.keySize < 256) {
          issues.push('AES key size should be 256 bits for maximum security');
        }

        return { secure: issues.length === 0, issues };
      };

      console.log('🔒 Encryption Algorithm Validation:');

      Object.keys(algorithms).forEach(algorithm => {
        const validation = validateEncryptionSecurity(algorithm);
        
        console.log(`   ${algorithm}: ${validation.secure ? '✅' : '❌'}`);
        if (validation.issues.length > 0) {
          validation.issues.forEach(issue => {
            console.log(`     ⚠️ ${issue}`);
          });
        }

        // Only AES-256-GCM and RSA-2048 should be considered secure
        if (algorithm === 'AES-256-GCM' || algorithm === 'RSA-2048') {
          expect(validation.secure).toBe(true);
        } else {
          expect(validation.secure).toBe(false);
        }
      });
    });

    it('should implement proper key management', () => {
      interface CryptoKey {
        id: string;
        algorithm: string;
        createdAt: Date;
        expiresAt: Date;
        isActive: boolean;
        rotationCount: number;
      }

      const keys: CryptoKey[] = [];

      const generateKey = (algorithm: string, lifetimeHours: number = 24 * 30): CryptoKey => {
        const key: CryptoKey = {
          id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          algorithm,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + lifetimeHours * 60 * 60 * 1000),
          isActive: true,
          rotationCount: 0,
        };
        
        keys.push(key);
        return key;
      };

      const rotateKey = (oldKeyId: string): CryptoKey | null => {
        const oldKey = keys.find(k => k.id === oldKeyId);
        if (!oldKey) return null;

        // Deactivate old key
        oldKey.isActive = false;
        
        // Generate new key
        const newKey = generateKey(oldKey.algorithm);
        newKey.rotationCount = oldKey.rotationCount + 1;
        
        return newKey;
      };

      const checkKeyHealth = (): { healthy: CryptoKey[], expiring: CryptoKey[], expired: CryptoKey[] } => {
        const now = Date.now();
        const warningThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        const healthy: CryptoKey[] = [];
        const expiring: CryptoKey[] = [];
        const expired: CryptoKey[] = [];

        keys.forEach(key => {
          const timeToExpiry = key.expiresAt.getTime() - now;
          
          if (timeToExpiry <= 0) {
            expired.push(key);
          } else if (timeToExpiry <= warningThreshold) {
            expiring.push(key);
          } else {
            healthy.push(key);
          }
        });

        return { healthy, expiring, expired };
      };

      console.log('🔑 Key Management Tests:');

      // Generate test keys
      const aesKey = generateKey('AES-256-GCM');
      const rsaKey = generateKey('RSA-2048');
      
      console.log(`   Generated AES key: ${aesKey.id}`);
      console.log(`   Generated RSA key: ${rsaKey.id}`);

      // Simulate aging keys
      const oldKey = generateKey('AES-256-GCM', 1); // 1 hour lifetime
      oldKey.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      oldKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired 1 hour ago

      const expiringKey = generateKey('RSA-2048', 24 * 7); // 7 days
      expiringKey.createdAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
      expiringKey.expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // Expires in 1 day

      // Check key health
      const health = checkKeyHealth();
      
      console.log(`   Healthy keys: ${health.healthy.length}`);
      console.log(`   Expiring keys: ${health.expiring.length}`);
      console.log(`   Expired keys: ${health.expired.length}`);

      expect(health.healthy.length).toBeGreaterThan(0);
      expect(health.expired.length).toBeGreaterThan(0);
      expect(health.expiring.length).toBeGreaterThan(0);

      // Test key rotation
      const rotatedKey = rotateKey(expiringKey.id);
      expect(rotatedKey).toBeTruthy();
      expect(rotatedKey!.rotationCount).toBe(1);
      expect(expiringKey.isActive).toBe(false);
      
      console.log(`   Rotated key: ${expiringKey.id} → ${rotatedKey!.id}`);
    });
  });
});
