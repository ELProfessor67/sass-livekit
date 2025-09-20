import { Pinecone } from '@pinecone-database/pinecone';

class PineconeAssistantHelper {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  }

  /**
   * Generate assistant name from company and knowledge base IDs
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @returns {string} Generated assistant name
   */
  generateAssistantName(companyId, knowledgeBaseId) {
    const companyShort = companyId.substring(0, 8);
    const kbShort = knowledgeBaseId.substring(0, 8);
    return `${companyShort}-${kbShort}-kb`;
  }

  /**
   * Create a Pinecone Assistant for a knowledge base
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string} knowledgeBaseName - The knowledge base name
   * @param {Object} options - Assistant configuration options
   * @returns {Promise<Object>} Assistant creation result
   */
  async createAssistant(companyId, knowledgeBaseId, knowledgeBaseName, options = {}) {
    try {
      // Generate assistant name from knowledge base ID
      const assistantName = this.generateAssistantName(companyId, knowledgeBaseId);
      
      console.log(`Creating Pinecone Assistant '${assistantName}' for KB ${knowledgeBaseId}`);
      
      // Default configuration
      const defaultConfig = {
        name: assistantName,
        instructions: options.instructions || `You are an AI assistant for the knowledge base "${knowledgeBaseName}". Use the provided knowledge base to answer questions accurately and helpfully. Use American English for spelling and grammar.`,
        region: options.region || 'us'
      };

      // Merge with provided options
      const config = { ...defaultConfig, ...options };

      // Create the assistant
      const assistant = await this.pinecone.createAssistant(config);

      console.log(`Successfully created assistant: ${assistant.name}`);

      return {
        success: true,
        created: true,
        assistant: {
          id: assistant.id,
          name: assistant.name,
          instructions: assistant.instructions,
          region: assistant.region,
          created_at: assistant.created_at,
          knowledge_base_id: knowledgeBaseId,
          user_id: companyId
        }
      };

    } catch (error) {
      console.error(`Error creating assistant for KB ${knowledgeBaseId}:`, error);
      
      // Handle specific Pinecone errors
      if (error.message?.includes('already exists')) {
        return {
          success: false,
          error: 'Assistant already exists',
          assistantName: this.generateAssistantName(companyId, knowledgeBaseId)
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ensure assistant exists for a knowledge base
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string} knowledgeBaseName - The knowledge base name
   * @param {Object} options - Assistant configuration options
   * @returns {Promise<Object>} Assistant creation result
   */
  async ensureAssistantExists(companyId, knowledgeBaseId, knowledgeBaseName, options = {}) {
    try {
      console.log(`Ensuring assistant exists for KB ${knowledgeBaseId} in company ${companyId}`);
      
      // Try to create assistant (will handle if already exists)
      const assistantResult = await this.createAssistant(
        companyId, 
        knowledgeBaseId, 
        knowledgeBaseName, 
        options
      );
      
      if (assistantResult.success) {
        console.log(`Assistant ${assistantResult.created ? 'created' : 'found'}: ${assistantResult.assistant.name}`);
      } else {
        console.warn(`Failed to create assistant: ${assistantResult.error}`);
      }
      
      return assistantResult;
    } catch (error) {
      console.error('Error ensuring assistant exists:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default PineconeAssistantHelper;

