import { logger } from '../logger.service';

export interface SocialEngineeringDetection {
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detected_patterns: string[];
  confidence: number;
  recommended_action: string;
}

export class SocialEngineeringDetectionService {
  private suspiciousPatterns: Array<{
    pattern: RegExp;
    threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }>;

  constructor() {
    this.suspiciousPatterns = [
      {
        pattern: /senha|password|login|acesso/i,
        threat_level: 'HIGH',
        description: 'Credential harvesting attempt',
      },
      {
        pattern: /sou\s+(médico|doutor|dr\.?)/i,
        threat_level: 'HIGH',
        description: 'Impersonation attempt',
      },
      {
        pattern: /(dados|informação).*(outros?|demais)\s+(pacientes?|clientes?)/i,
        threat_level: 'CRITICAL',
        description: 'Patient data request',
      },
      {
        pattern: /urgente.*transferir|pix.*emergência/i,
        threat_level: 'HIGH',
        description: 'Financial fraud attempt',
      },
      {
        pattern: /administrador|admin|sistema|backup/i,
        threat_level: 'MEDIUM',
        description: 'System access probing',
      },
      {
        pattern: /não.*diga.*ninguém|segredo|confidencial/i,
        threat_level: 'HIGH',
        description: 'Social engineering tactics',
      },
    ];

    logger.info('Social Engineering Detection Service initialized', {
      patterns: this.suspiciousPatterns.length,
    });
  }

  /**
   * Analyze message for social engineering attempts
   */
  async analyzeMessage(message: string): Promise<SocialEngineeringDetection> {
    const detectedPatterns: string[] = [];
    let maxThreatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let confidence = 0;

    // Check against all suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.pattern.test(message)) {
        detectedPatterns.push(pattern.description);
        
        // Update threat level if higher
        if (this.getThreatLevelScore(pattern.threat_level) > this.getThreatLevelScore(maxThreatLevel)) {
          maxThreatLevel = pattern.threat_level;
        }
        
        confidence += 0.3;
      }
    }

    // Additional heuristics
    const words = message.toLowerCase().split(/\s+/);
    const urgentWords = ['urgente', 'emergência', 'rápido', 'agora', 'imediato'];
    const urgentCount = words.filter(word => urgentWords.includes(word)).length;
    
    if (urgentCount >= 2) {
      confidence += 0.2;
      if (maxThreatLevel === 'LOW') maxThreatLevel = 'MEDIUM';
    }

    // Normalize confidence
    confidence = Math.min(1, confidence);

    const result: SocialEngineeringDetection = {
      threat_level: maxThreatLevel,
      detected_patterns: detectedPatterns,
      confidence,
      recommended_action: this.getRecommendedAction(maxThreatLevel),
    };

    if (maxThreatLevel !== 'LOW') {
      logger.warn('Social engineering attempt detected', {
        threat_level: maxThreatLevel,
        patterns: detectedPatterns,
        confidence,
        messageSample: message.substring(0, 50) + '...',
      });
    }

    return result;
  }

  private getThreatLevelScore(level: string): number {
    switch (level) {
      case 'LOW': return 1;
      case 'MEDIUM': return 2;
      case 'HIGH': return 3;
      case 'CRITICAL': return 4;
      default: return 0;
    }
  }

  private getRecommendedAction(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL':
        return 'Block immediately and alert security team';
      case 'HIGH':
        return 'Escalate to human agent with warning';
      case 'MEDIUM':
        return 'Monitor conversation closely';
      case 'LOW':
      default:
        return 'Continue normal processing';
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; patterns: number }> {
    return {
      status: 'healthy',
      patterns: this.suspiciousPatterns.length,
    };
  }
}