export { EncryptionService, encryptionService } from './encryption.service';
export type { EncryptedData, EncryptedFile } from './encryption.service';

export { MFAService } from './mfa.service';
export type { TOTPSetup, SMSCodeResult, MFAVerificationResult } from './mfa.service';

export { LGPDComplianceService } from './lgpd-compliance.service';
export type { 
  ConsentRecord, 
  DataExportRequest, 
  DataDeletionRequest, 
  ConsentType 
} from './lgpd-compliance.service';

export { SecurityMiddleware, securityMiddleware, defaultSecurityConfig } from './security.middleware';
export type { SecurityConfig } from './security.middleware';