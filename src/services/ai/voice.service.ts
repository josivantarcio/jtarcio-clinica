import { logger } from '../logger.service';

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  urgencyDetected: boolean;
  processingTime: number;
}

export interface VoiceProcessingOptions {
  language?: string;
  urgencyDetection?: boolean;
  confidenceThreshold?: number;
}

export class VoiceRecognitionService {
  private defaultLanguage: string;
  private urgencyKeywords: string[];
  private confidenceThreshold: number;

  constructor() {
    this.defaultLanguage = process.env.AI_RESPONSE_LANGUAGE || 'pt-BR';
    this.confidenceThreshold = 0.6;

    // Portuguese urgency detection keywords
    this.urgencyKeywords = [
      'urgente',
      'emergência',
      'emergency',
      'socorro',
      'ajuda',
      'dor forte',
      'dor intensa',
      'sangramento',
      'sangrando',
      'febre alta',
      'febre muito alta',
      'não consigo',
      'muito mal',
      'grave',
      'sério',
      'crítico',
      'imediato',
      'agora',
      'desmaiei',
      'desmaiando',
      'tonteira forte',
      'vomitando muito',
      'peito apertado',
      'falta de ar',
      'respirar',
      'coração acelerado',
      'dormência',
      'formigamento',
      'visão turva',
      'confuso',
    ];

    logger.info('Voice Recognition Service initialized', {
      defaultLanguage: this.defaultLanguage,
      urgencyKeywordsCount: this.urgencyKeywords.length,
      confidenceThreshold: this.confidenceThreshold,
    });
  }

  /**
   * Transcribe audio buffer to text with Portuguese optimization
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: VoiceProcessingOptions = {},
  ): Promise<VoiceTranscription> {
    const startTime = Date.now();
    const language = options.language || this.defaultLanguage;

    try {
      logger.info('Starting voice transcription', {
        audioSize: audioBuffer.length,
        language,
        urgencyDetection: options.urgencyDetection !== false,
      });

      // In production, this would integrate with WAHA's voice transcription
      // or Google Speech-to-Text API. For now, we'll simulate the transcription
      const transcriptionResult = await this.performTranscription(
        audioBuffer,
        language,
      );

      // Detect urgency in transcribed text
      const urgencyDetected =
        options.urgencyDetection !== false
          ? this.detectUrgencyInText(transcriptionResult.text)
          : false;

      // Validate confidence threshold
      const meetsThreshold =
        transcriptionResult.confidence >=
        (options.confidenceThreshold || this.confidenceThreshold);

      const processingTime = Date.now() - startTime;

      logger.info('Voice transcription completed', {
        textLength: transcriptionResult.text.length,
        confidence: transcriptionResult.confidence,
        urgencyDetected,
        meetsThreshold,
        processingTime,
        language,
      });

      return {
        text: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        language,
        urgencyDetected,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Voice transcription failed:', {
        error: error.message,
        audioSize: audioBuffer.length,
        processingTime,
        language,
      });

      // Return empty result on failure
      return {
        text: '',
        confidence: 0,
        language,
        urgencyDetected: false,
        processingTime,
      };
    }
  }

  /**
   * Transcribe audio from URL (WAHA integration)
   */
  async transcribeFromUrl(
    audioUrl: string,
    options: VoiceProcessingOptions = {},
  ): Promise<VoiceTranscription> {
    const startTime = Date.now();

    try {
      logger.info('Transcribing audio from URL', {
        audioUrl: this.sanitizeUrl(audioUrl),
        language: options.language || this.defaultLanguage,
      });

      // Download audio buffer from URL
      const audioBuffer = await this.downloadAudioFromUrl(audioUrl);

      // Transcribe the downloaded audio
      return await this.transcribeAudio(audioBuffer, options);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('URL transcription failed:', {
        error: error.message,
        audioUrl: this.sanitizeUrl(audioUrl),
        processingTime,
      });

      return {
        text: '',
        confidence: 0,
        language: options.language || this.defaultLanguage,
        urgencyDetected: false,
        processingTime,
      };
    }
  }

  /**
   * Perform actual transcription (placeholder for real implementation)
   */
  private async performTranscription(
    audioBuffer: Buffer,
    language: string,
  ): Promise<{
    text: string;
    confidence: number;
  }> {
    // In production, this would integrate with:
    // 1. Google Speech-to-Text API
    // 2. WAHA's built-in transcription
    // 3. OpenAI Whisper API
    // 4. Azure Speech Services

    // Mock implementation for testing and development
    const mockTranscriptions = [
      {
        text: 'Olá, preciso marcar uma consulta com cardiologista',
        confidence: 0.95,
      },
      { text: 'Estou sentindo dor no peito e falta de ar', confidence: 0.89 },
      { text: 'Gostaria de agendar um check-up', confidence: 0.92 },
      { text: 'Tenho uma dor de cabeça muito forte', confidence: 0.87 },
      { text: 'Preciso de uma consulta urgente', confidence: 0.94 },
      { text: 'Minha filha está com febre alta', confidence: 0.91 },
    ];

    // Simulate processing delay
    await new Promise(resolve =>
      setTimeout(resolve, 1500 + Math.random() * 1000),
    );

    // Return random mock transcription for development
    const mockResult =
      mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];

    return {
      text: mockResult.text,
      confidence: mockResult.confidence + (Math.random() * 0.1 - 0.05), // Add slight variation
    };
  }

  /**
   * Download audio buffer from URL
   */
  private async downloadAudioFromUrl(url: string): Promise<Buffer> {
    try {
      // In production, implement actual HTTP download
      // For now, return a mock buffer
      return Buffer.alloc(1024); // Mock audio buffer
    } catch (error) {
      logger.error('Failed to download audio from URL:', {
        url: this.sanitizeUrl(url),
        error: error.message,
      });
      throw new Error('Failed to download audio file');
    }
  }

  /**
   * Detect urgency keywords in transcribed text
   */
  private detectUrgencyInText(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const lowerText = text.toLowerCase();
    const urgencyDetected = this.urgencyKeywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase()),
    );

    if (urgencyDetected) {
      logger.info('Urgency detected in transcribed text', {
        textSample: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        matchedKeywords: this.urgencyKeywords.filter(keyword =>
          lowerText.includes(keyword.toLowerCase()),
        ),
      });
    }

    return urgencyDetected;
  }

  /**
   * Analyze audio quality and provide feedback
   */
  async analyzeAudioQuality(audioBuffer: Buffer): Promise<{
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    confidence: number;
    recommendations?: string[];
  }> {
    try {
      // Mock quality analysis - in production would analyze actual audio properties
      const size = audioBuffer.length;
      let quality: 'poor' | 'fair' | 'good' | 'excellent';
      let confidence: number;
      const recommendations: string[] = [];

      if (size < 1000) {
        quality = 'poor';
        confidence = 0.3;
        recommendations.push('Áudio muito curto - tente falar por mais tempo');
        recommendations.push('Verifique se o microfone está funcionando');
      } else if (size < 5000) {
        quality = 'fair';
        confidence = 0.6;
        recommendations.push('Tente falar mais próximo do microfone');
      } else if (size < 20000) {
        quality = 'good';
        confidence = 0.85;
      } else {
        quality = 'excellent';
        confidence = 0.95;
      }

      logger.info('Audio quality analysis completed', {
        audioSize: size,
        quality,
        confidence,
        recommendationsCount: recommendations.length,
      });

      return {
        quality,
        confidence,
        recommendations:
          recommendations.length > 0 ? recommendations : undefined,
      };
    } catch (error) {
      logger.error('Audio quality analysis failed:', error);

      return {
        quality: 'poor',
        confidence: 0,
        recommendations: ['Erro ao analisar qualidade do áudio'],
      };
    }
  }

  /**
   * Get supported languages for transcription
   */
  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    nativeName: string;
    confidence: number;
  }> {
    return [
      {
        code: 'pt-BR',
        name: 'Portuguese (Brazil)',
        nativeName: 'Português (Brasil)',
        confidence: 0.95,
      },
      {
        code: 'pt-PT',
        name: 'Portuguese (Portugal)',
        nativeName: 'Português (Portugal)',
        confidence: 0.9,
      },
      {
        code: 'en-US',
        name: 'English (US)',
        nativeName: 'English (US)',
        confidence: 0.85,
      },
      {
        code: 'es-ES',
        name: 'Spanish',
        nativeName: 'Español',
        confidence: 0.8,
      },
    ];
  }

  /**
   * Health check for voice service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    supportedLanguages: number;
    urgencyKeywords: number;
    error?: string;
  }> {
    try {
      // Test with a small mock buffer
      const testBuffer = Buffer.from('test audio data');
      const testResult = await this.transcribeAudio(testBuffer, {
        language: 'pt-BR',
      });

      return {
        status: 'healthy',
        supportedLanguages: this.getSupportedLanguages().length,
        urgencyKeywords: this.urgencyKeywords.length,
      };
    } catch (error) {
      logger.error('Voice service health check failed:', error);

      return {
        status: 'unhealthy',
        supportedLanguages: 0,
        urgencyKeywords: this.urgencyKeywords.length,
        error: error.message,
      };
    }
  }

  /**
   * Update urgency keywords (for dynamic learning)
   */
  updateUrgencyKeywords(newKeywords: string[]): void {
    const currentCount = this.urgencyKeywords.length;

    // Add new keywords that aren't already present
    const uniqueKeywords = newKeywords.filter(
      keyword => !this.urgencyKeywords.includes(keyword.toLowerCase()),
    );

    this.urgencyKeywords.push(...uniqueKeywords.map(k => k.toLowerCase()));

    logger.info('Urgency keywords updated', {
      previousCount: currentCount,
      newKeywords: uniqueKeywords.length,
      totalCount: this.urgencyKeywords.length,
    });
  }

  /**
   * Sanitize URL for logging (remove sensitive parameters)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return 'invalid-url';
    }
  }
}
