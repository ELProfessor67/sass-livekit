// import Queue from 'bull'; // Commented out to avoid import issues
import PineconeAssistantUploadService from '../services/pinecone-assistant-upload-service.js';
import KnowledgeBaseDatabaseService from '../services/knowledge-base-database-service.js';

class DocumentProcessor {
  constructor() {
    this.databaseService = new KnowledgeBaseDatabaseService();
    this.pineconeUploadService = new PineconeAssistantUploadService();
    // this.documentQueue = new Queue('document processing', process.env.REDIS_URL); // Commented out due to Queue import issues
    // this.setupProcessors(); // Commented out due to Queue import issues
  }

  // setupProcessors() {
  //   // Method commented out due to Queue import issues
  // }

  // Process document by uploading to Pinecone Assistant
  async processDocument(docId) {
    try {
      console.log(`Processing document: ${docId}`);
      
      // Get document details
      const document = await this.databaseService.getDocument(docId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get knowledge base details to find the assistant name
      const knowledgeBase = await this.databaseService.getKnowledgeBase(document.knowledge_base_id);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }

      // Check if we have a Pinecone assistant name
      if (!knowledgeBase.pinecone_assistant_name) {
        console.log(`No Pinecone assistant found for knowledge base ${document.knowledge_base_id}, attempting to create one...`);
        
        // Try to create an assistant for this knowledge base
        const PineconeAssistantHelper = (await import('../services/pinecone-assistant-helper.js')).default;
        const pineconeHelper = new PineconeAssistantHelper();
        
        const assistantResult = await pineconeHelper.ensureAssistantExists(
          document.company_id,
          document.knowledge_base_id,
          knowledgeBase.name,
          {
            instructions: `You are an AI assistant for the knowledge base "${knowledgeBase.name}". Use the provided knowledge base to answer questions accurately and helpfully. Use American English for spelling and grammar.`,
            region: 'us'
          }
        );
        
        if (!assistantResult.success || !assistantResult.assistant) {
          throw new Error(`Failed to create Pinecone assistant: ${assistantResult.error}`);
        }
        
        // Update the knowledge base with the assistant info
        await this.databaseService.updateKnowledgeBaseAssistantInfo(document.knowledge_base_id, assistantResult.assistant);
        
        // Update the knowledge base object for the rest of the function
        knowledgeBase.pinecone_assistant_name = assistantResult.assistant.name;
        console.log(`Created Pinecone assistant: ${assistantResult.assistant.name}`);
      }
      
      // Final fallback - generate assistant name if still not available
      if (!knowledgeBase.pinecone_assistant_name) {
        // Generate assistant name using the same pattern as the helper
        const assistantName = `kb-${document.company_id.substring(0, 8)}-${document.knowledge_base_id.substring(0, 8)}`;
        console.log(`Using generated assistant name: ${assistantName}`);
        knowledgeBase.pinecone_assistant_name = assistantName;
      }

      console.log(`Uploading document to Pinecone Assistant: ${knowledgeBase.pinecone_assistant_name}`);
      
      // Upload file to Pinecone Assistant
      const uploadResult = await this.pineconeUploadService.uploadFileAndWait(
        knowledgeBase.pinecone_assistant_name,
        document.file_path,
        {
          document_id: docId,
          knowledge_base_id: document.knowledge_base_id,
          company_id: document.company_id,
          original_filename: document.original_filename,
          file_size: document.file_size,
          upload_timestamp: document.upload_timestamp
        },
        {
          maxAttempts: 60, // 5 minutes
          interval: 5000   // 5 seconds
        }
      );

      if (!uploadResult.success) {
        throw new Error(`Failed to upload to Pinecone Assistant: ${uploadResult.error}`);
      }

      if (!uploadResult.fullyProcessed) {
        console.log(`File uploaded but processing not complete. Status: ${uploadResult.processingResult?.status || 'unknown'}`);
        // Don't fail if the file is uploaded but still processing - Pinecone will continue processing in background
        if (uploadResult.processingResult?.status === 'failed' || uploadResult.processingResult?.status === 'error') {
          throw new Error(`File processing failed: ${uploadResult.processingResult?.error || 'Unknown error'}`);
        }
      }

      // Update document status to indicate it's been uploaded to Pinecone Assistant
      // Document status is now tracked via pinecone_status in updateDocumentPineconeInfo
      
      // Update document with Pinecone file ID
      await this.databaseService.updateDocumentPineconeInfo(docId, {
        pinecone_file_id: uploadResult.fileId,
        pinecone_status: 'ready',
        pinecone_processed_at: new Date().toISOString()
      });
      
      console.log(`Document successfully uploaded to Pinecone Assistant: ${docId} -> ${uploadResult.fileId}`);
      return { 
        success: true, 
        docId,
        pineconeFileId: uploadResult.fileId,
        assistantName: knowledgeBase.pinecone_assistant_name
      };
      
    } catch (error) {
      console.error(`Document processing failed: ${docId}`, error);
      // Update document with error status via Pinecone info
      await this.databaseService.updateDocumentPineconeInfo(docId, {
        pinecone_status: 'error'
      });
      throw error;
    }
  }

  // Add document to queue (commented out due to Queue import issues)
  // async addDocumentToQueue(docId) {
  //   return await this.documentQueue.add('process-document', { docId });
  // }

  // Get queue status (commented out due to Queue import issues)
  // async getQueueStatus() {
  //   const waiting = await this.documentQueue.getWaiting();
  //   const active = await this.documentQueue.getActive();
  //   const completed = await this.documentQueue.getCompleted();
  //   const failed = await this.documentQueue.getFailed();
  //   
  //   return {
  //     waiting: waiting.length,
  //     active: active.length,
  //     completed: completed.length,
  //     failed: failed.length
  //   };
  // }
}

export default DocumentProcessor;