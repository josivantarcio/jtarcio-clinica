import { ChromaApi, OpenAIEmbeddingFunction, Collection } from 'chromadb';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface DocumentMetadata {
  userId?: string;
  conversationId?: string;
  timestamp?: string;
  type?: 'conversation' | 'knowledge' | 'faq';
  specialty?: string;
  intent?: string;
  source?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  distance: number;
  score: number; // 1 - distance for easier interpretation
}

export interface EmbeddingStats {
  totalDocuments: number;
  conversationDocuments: number;
  knowledgeDocuments: number;
  faqDocuments: number;
}

export class ChromaDBClient {
  private client: ChromaApi;
  private embeddingFunction: OpenAIEmbeddingFunction;
  private collections: Map<string, Collection> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.client = new ChromaApi({
      host: env.CHROMA_HOST,
      port: env.CHROMA_PORT,
    });

    // Initialize embedding function
    // Note: This would typically use OpenAI embeddings or another embedding service
    // For this implementation, we'll use ChromaDB's default embedding function
    this.embeddingFunction = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY || 'dummy-key', // ChromaDB will use default if no key
    });
  }

  /**
   * Initialize ChromaDB collections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing ChromaDB client');

      // Create or get main conversation collection
      const conversationCollection = await this.client.getOrCreateCollection({
        name: env.CHROMA_COLLECTION_NAME,
        embeddingFunction: this.embeddingFunction,
        metadata: { description: 'Medical clinic conversations and context' }
      });

      // Create knowledge base collection
      const knowledgeCollection = await this.client.getOrCreateCollection({
        name: 'clinic_knowledge',
        embeddingFunction: this.embeddingFunction,
        metadata: { description: 'Medical knowledge base and FAQs' }
      });

      this.collections.set('conversations', conversationCollection);
      this.collections.set('knowledge', knowledgeCollection);

      await this.initializeKnowledgeBase();

      this.isInitialized = true;
      logger.info('ChromaDB client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ChromaDB client', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Initialize medical knowledge base
   */
  private async initializeKnowledgeBase(): Promise<void> {
    const knowledgeCollection = this.collections.get('knowledge');
    if (!knowledgeCollection) {
      throw new Error('Knowledge collection not initialized');
    }

    // Check if knowledge base is already populated
    const count = await knowledgeCollection.count();
    if (count > 0) {
      logger.info('Knowledge base already populated', { documentCount: count });
      return;
    }

    logger.info('Populating initial knowledge base');

    const knowledgeDocuments = [
      {
        id: 'specialty_cardiology',
        content: 'Cardiologia é a especialidade médica que cuida do coração e sistema circulatório. Trata problemas como arritmias, hipertensão, infarto, insuficiência cardíaca. Consultas geralmente duram 30-45 minutos.',
        metadata: {
          type: 'knowledge' as const,
          specialty: 'cardiologia',
          source: 'medical_guide'
        }
      },
      {
        id: 'specialty_orthopedics',
        content: 'Ortopedia trata problemas do sistema musculoesquelético: ossos, articulações, músculos, ligamentos. Comum para fraturas, lesões esportivas, dores nas costas, artrose.',
        metadata: {
          type: 'knowledge' as const,
          specialty: 'ortopedia',
          source: 'medical_guide'
        }
      },
      {
        id: 'specialty_pediatrics',
        content: 'Pediatria cuida da saúde de bebês, crianças e adolescentes até 18 anos. Acompanha crescimento, desenvolvimento, vacinação, doenças infantis.',
        metadata: {
          type: 'knowledge' as const,
          specialty: 'pediatria',
          source: 'medical_guide'
        }
      },
      {
        id: 'emergency_protocols',
        content: 'Em caso de emergência médica: dor no peito, dificuldade respiratória, sangramento intenso, perda de consciência - procure atendimento de urgência imediatamente. Nossa clínica possui protocolo de emergência.',
        metadata: {
          type: 'knowledge' as const,
          source: 'emergency_protocol'
        }
      },
      {
        id: 'appointment_cancellation',
        content: 'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência. Cancelamentos tardios podem gerar cobrança. É possível reagendar através do chat ou telefone.',
        metadata: {
          type: 'faq' as const,
          source: 'clinic_policy'
        }
      },
      {
        id: 'insurance_coverage',
        content: 'Trabalhamos com os principais convênios: Unimed, Bradesco Saúde, SulAmérica, Amil. Verifique cobertura antes da consulta. Atendimento particular também disponível.',
        metadata: {
          type: 'faq' as const,
          source: 'clinic_policy'
        }
      },
      {
        id: 'clinic_hours',
        content: 'Horários de funcionamento: Segunda a Sexta 7h às 19h, Sábados 7h às 12h. Emergências: 24 horas através do telefone de plantão.',
        metadata: {
          type: 'faq' as const,
          source: 'clinic_info'
        }
      }
    ];

    try {
      await knowledgeCollection.add({
        ids: knowledgeDocuments.map(doc => doc.id),
        documents: knowledgeDocuments.map(doc => doc.content),
        metadatas: knowledgeDocuments.map(doc => doc.metadata)
      });

      logger.info('Knowledge base populated successfully', { 
        documentCount: knowledgeDocuments.length 
      });
    } catch (error) {
      logger.error('Failed to populate knowledge base', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add conversation message to vector database
   */
  async addConversationMessage(
    messageId: string,
    content: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    await this.ensureInitialized();

    const collection = this.collections.get('conversations');
    if (!collection) {
      throw new Error('Conversation collection not initialized');
    }

    try {
      await collection.add({
        ids: [messageId],
        documents: [content],
        metadatas: [{
          ...metadata,
          timestamp: metadata.timestamp || new Date().toISOString(),
          type: 'conversation'
        }]
      });

      logger.debug('Conversation message added to vector DB', { messageId, userId: metadata.userId });
    } catch (error) {
      logger.error('Failed to add conversation message', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Search for similar conversations or knowledge
   */
  async searchSimilar(
    query: string,
    options: {
      collection?: 'conversations' | 'knowledge';
      limit?: number;
      threshold?: number;
      filter?: Partial<DocumentMetadata>;
    } = {}
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const {
      collection: collectionName = 'knowledge',
      limit = 5,
      threshold = 0.7,
      filter = {}
    } = options;

    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not initialized`);
    }

    try {
      // Build metadata filter
      const where = Object.keys(filter).length > 0 ? filter : undefined;

      const results = await collection.query({
        queryTexts: [query],
        nResults: limit,
        where
      });

      const searchResults: SearchResult[] = [];

      if (results.ids && results.distances && results.documents && results.metadatas) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances[0][i];
          const score = 1 - distance;

          // Filter by threshold
          if (score >= threshold) {
            searchResults.push({
              id: results.ids[0][i],
              content: results.documents[0][i] || '',
              metadata: results.metadatas[0][i] as DocumentMetadata || {},
              distance,
              score
            });
          }
        }
      }

      logger.debug('Similarity search completed', {
        query: query.substring(0, 100),
        collection: collectionName,
        resultsFound: searchResults.length,
        resultsFiltered: searchResults.filter(r => r.score >= threshold).length
      });

      return searchResults.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Similarity search failed', {
        query: query.substring(0, 100),
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get conversation history for a user
   */
  async getConversationHistory(
    userId: string,
    conversationId?: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const collection = this.collections.get('conversations');
    if (!collection) {
      throw new Error('Conversation collection not initialized');
    }

    try {
      const filter: Partial<DocumentMetadata> = { userId };
      if (conversationId) {
        filter.conversationId = conversationId;
      }

      // For conversation history, we want chronological order, not similarity
      // So we'll get all documents for the user and sort by timestamp
      const results = await collection.get({
        where: filter,
        limit
      });

      const history: SearchResult[] = [];

      if (results.ids && results.documents && results.metadatas) {
        for (let i = 0; i < results.ids.length; i++) {
          history.push({
            id: results.ids[i],
            content: results.documents[i] || '',
            metadata: results.metadatas[i] as DocumentMetadata || {},
            distance: 0,
            score: 1
          });
        }
      }

      // Sort by timestamp (newest first)
      history.sort((a, b) => {
        const timestampA = a.metadata.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
        const timestampB = b.metadata.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
        return timestampB - timestampA;
      });

      return history;
    } catch (error) {
      logger.error('Failed to get conversation history', {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get contextual information for a query
   */
  async getContext(
    query: string,
    userId: string,
    conversationId?: string
  ): Promise<{
    similarConversations: SearchResult[];
    relevantKnowledge: SearchResult[];
    recentHistory: SearchResult[];
  }> {
    await this.ensureInitialized();

    const [similarConversations, relevantKnowledge, recentHistory] = await Promise.all([
      // Find similar past conversations
      this.searchSimilar(query, {
        collection: 'conversations',
        limit: 3,
        threshold: 0.6,
        filter: { userId }
      }),
      // Find relevant knowledge base entries
      this.searchSimilar(query, {
        collection: 'knowledge',
        limit: 5,
        threshold: 0.5
      }),
      // Get recent conversation history
      this.getConversationHistory(userId, conversationId, 5)
    ]);

    return {
      similarConversations,
      relevantKnowledge,
      recentHistory
    };
  }

  /**
   * Get statistics about the embeddings
   */
  async getStats(): Promise<EmbeddingStats> {
    await this.ensureInitialized();

    const conversationCollection = this.collections.get('conversations');
    const knowledgeCollection = this.collections.get('knowledge');

    const [conversationCount, knowledgeCount] = await Promise.all([
      conversationCollection?.count() || 0,
      knowledgeCollection?.count() || 0
    ]);

    // Get detailed stats from conversation collection
    let conversationDocuments = 0;
    let faqDocuments = 0;

    if (knowledgeCollection) {
      try {
        const faqResults = await knowledgeCollection.get({
          where: { type: 'faq' }
        });
        faqDocuments = faqResults.ids?.length || 0;
      } catch (error) {
        logger.warn('Could not get FAQ stats', { error });
      }
    }

    return {
      totalDocuments: conversationCount + knowledgeCount,
      conversationDocuments: conversationCount,
      knowledgeDocuments: knowledgeCount - faqDocuments,
      faqDocuments
    };
  }

  /**
   * Health check for ChromaDB
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      logger.error('ChromaDB health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Clean up old conversation data (LGPD compliance)
   */
  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    await this.ensureInitialized();

    const collection = this.collections.get('conversations');
    if (!collection) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      // Get old documents
      const oldDocuments = await collection.get({
        where: {
          timestamp: { $lt: cutoffDate.toISOString() }
        }
      });

      if (oldDocuments.ids && oldDocuments.ids.length > 0) {
        await collection.delete({
          ids: oldDocuments.ids
        });

        logger.info('Cleaned up old conversation data', {
          deletedCount: oldDocuments.ids.length,
          cutoffDate: cutoffDate.toISOString()
        });

        return oldDocuments.ids.length;
      }

      return 0;
    } catch (error) {
      logger.error('Failed to cleanup old data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Ensure client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default ChromaDBClient;