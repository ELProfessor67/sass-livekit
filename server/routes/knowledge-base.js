import express from 'express';
import fs from 'fs';
import path from 'path';
import DocumentUploadService from '../services/document-upload-service.js';
import KnowledgeBaseDatabaseService from '../services/knowledge-base-database-service.js';
import DocumentProcessor from '../workers/document-processor.js';
import PineconeAssistantHelper from '../services/pinecone-assistant-helper.js';
import PineconeContextService from '../services/pinecone-context-service.js';

const router = express.Router();

// Initialize services
const databaseService = new KnowledgeBaseDatabaseService();
const uploadService = new DocumentUploadService(databaseService);
const documentProcessor = new DocumentProcessor();
const pineconeHelper = new PineconeAssistantHelper();
const contextService = new PineconeContextService();
const uploadsDir = uploadService?.uploadsDir || path.join(process.cwd(), 'uploads');

const ensureUploadsDirExists = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

const createTextFileForDocument = async (document, contentText) => {
  ensureUploadsDirExists();

  const fileExtension = '.txt';
  const storedFileName = `${document.doc_id}${fileExtension}`;
  const originalFileName = document.original_filename?.endsWith(fileExtension)
    ? document.original_filename
    : `${document.content_name || 'text-content'}${fileExtension}`;

  const filePath = path.join(uploadsDir, storedFileName);
  await fs.promises.writeFile(filePath, contentText, 'utf8');

  const fileSize = Buffer.byteLength(contentText, 'utf8');

  const updatedDocument = await databaseService.updateDocumentFileInfo(document.doc_id, {
    filename: storedFileName,
    original_filename: originalFileName,
    file_path: filePath,
    file_size: fileSize,
    status: 'uploaded',
    pinecone_status: 'uploaded'
  });

  return updatedDocument;
};

// Middleware to extract user ID from JWT or session
const extractUserId = (req, res, next) => {
  // This should be replaced with your actual auth middleware
  req.user = { id: req.headers['user-id'] || 'default-user' };
  next();
};

// Document upload endpoint
router.post('/upload', extractUserId, uploadService.getUploadMiddleware(), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { companyId, knowledgeBaseId, contentName, contentDescription, contentType } = req.body;
    console.log('Upload request body:', { companyId, knowledgeBaseId, contentName, contentDescription, contentType });
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Extract content metadata
    const contentMetadata = {
      content_name: contentName,
      content_description: contentDescription,
      content_type: contentType || 'document'
    };

    const document = await uploadService.uploadDocument(req.file, companyId, req.user.id, contentMetadata);
    
    // Associate document with knowledge base if provided
    if (knowledgeBaseId) {
      console.log('Associating document', document.doc_id, 'with knowledge base', knowledgeBaseId);
      await databaseService.associateDocumentWithKnowledgeBase(document.doc_id, knowledgeBaseId);
      
      // Process document by uploading to Pinecone Assistant
      console.log('Processing document with Pinecone Assistant...');
      try {
        const processResult = await documentProcessor.processDocument(document.doc_id);
        console.log('Document processing result:', processResult);
      } catch (processError) {
        console.error('Document processing error:', processError);
        // Don't fail the upload if processing fails, just log it
      }
    } else {
      console.log('No knowledge base ID provided, document will not be associated');
    }
    
    res.json({ 
      success: true, 
      document: {
        doc_id: document.doc_id,
        filename: document.original_filename,
        file_size: document.file_size,
        status: 'uploaded',
        upload_timestamp: document.upload_timestamp,
        content_name: document.content_name,
        content_description: document.content_description,
        content_type: document.content_type
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Knowledge Base CRUD endpoints
// Create knowledge base
console.log('Registering POST /knowledge-bases route');
router.post('/knowledge-bases', extractUserId, async (req, res) => {
  try {
    const { companyId, name, description } = req.body;
    
    if (!companyId || !name) {
      return res.status(400).json({ error: 'Company ID and name are required' });
    }

    // Create knowledge base in database
    const knowledgeBase = await databaseService.createKnowledgeBase({
      company_id: companyId,
      name,
      description: description || ''
    });

    // Create Pinecone Assistant for this knowledge base
    let pineconeAssistant = null;
    try {
      console.log(`Creating assistant for knowledge base: ${knowledgeBase.id}`);
      const assistantResult = await pineconeHelper.ensureAssistantExists(
        companyId, 
        knowledgeBase.id, 
        knowledgeBase.name,
        {
          instructions: `You are an AI assistant for the knowledge base "${knowledgeBase.name}". Use the provided knowledge base to answer questions accurately and helpfully. Use American English for spelling and grammar.`,
          region: 'us'
        }
      );
      
      if (assistantResult.success) {
        pineconeAssistant = assistantResult.assistant;
        console.log(`Pinecone assistant ${assistantResult.created ? 'created' : 'found'}: ${pineconeAssistant.name}`);
        
        // Save assistant information to database
        try {
          await databaseService.updateKnowledgeBaseAssistantInfo(knowledgeBase.id, pineconeAssistant);
          console.log(`Saved Pinecone assistant info to database for KB: ${knowledgeBase.id}`);
        } catch (dbError) {
          console.error('Failed to save Pinecone assistant info to database:', dbError);
        }
      } else {
        console.warn(`Failed to create Pinecone assistant: ${assistantResult.error}`);
      }
    } catch (pineconeError) {
      console.error('Pinecone assistant creation error:', pineconeError);
      // Don't fail the knowledge base creation if Pinecone fails
      // Just log the error and continue
    }
    
    res.json({ 
      success: true, 
      knowledgeBase,
      pineconeAssistant: pineconeAssistant ? {
        id: pineconeAssistant.id,
        name: pineconeAssistant.name,
        instructions: pineconeAssistant.instructions,
        region: pineconeAssistant.region,
        created_at: pineconeAssistant.created_at,
        knowledge_base_id: pineconeAssistant.knowledge_base_id,
        user_id: pineconeAssistant.user_id
      } : null
    });
  } catch (error) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get knowledge base with documents (MUST come first to avoid route conflicts)
router.get('/knowledge-bases/:kbId', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const knowledgeBase = await databaseService.getKnowledgeBase(kbId);
    const documents = await databaseService.getDocumentsByKnowledgeBase(kbId);
    
    res.json({ 
      knowledgeBase: {
        ...knowledgeBase,
        documents: documents
      }
    });
  } catch (error) {
    console.error('Get knowledge base with documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get knowledge bases by company
router.get('/knowledge-bases/company/:companyId', extractUserId, async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('Getting knowledge bases for company:', companyId);
    
    const knowledgeBases = await databaseService.getKnowledgeBasesByCompany(companyId);
    console.log('Found knowledge bases:', knowledgeBases.length);
    
    res.json({ knowledgeBases });
  } catch (error) {
    console.error('Get knowledge bases error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Update knowledge base
router.put('/knowledge-bases/:kbId', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const updateData = req.body;
    
    const knowledgeBase = await databaseService.updateKnowledgeBase(kbId, updateData);
    
    res.json({ success: true, knowledgeBase });
  } catch (error) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete knowledge base
router.delete('/knowledge-bases/:kbId', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    await databaseService.deleteKnowledgeBase(kbId);
    
    res.json({ success: true, message: 'Knowledge base deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Associate document with knowledge base
router.post('/knowledge-bases/:kbId/documents/:docId', extractUserId, async (req, res) => {
  try {
    const { kbId, docId } = req.params;
    
    const document = await databaseService.associateDocumentWithKnowledgeBase(docId, kbId);
    
    res.json({ success: true, document });
  } catch (error) {
    console.error('Associate document error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get documents by company
router.get('/documents/:companyId', extractUserId, async (req, res) => {
  try {
    const { companyId } = req.params;
    const documents = await databaseService.getDocumentsByCompany(companyId);
    
    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document status
router.get('/documents/:docId/status', extractUserId, async (req, res) => {
  try {
    const { docId } = req.params;
    const document = await databaseService.getDocument(docId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ 
      doc_id: document.doc_id,
      status: document.status,
      filename: document.original_filename,
      created_at: document.created_at,
      updated_at: document.updated_at
    });
  } catch (error) {
    console.error('Get document status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document details
router.get('/documents/:docId/details', extractUserId, async (req, res) => {
  try {
    const { docId } = req.params;
    const document = await databaseService.getDocument(docId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get extracted text
    const extractedText = await databaseService.getExtractedText(docId);
    
    // Get chunks
    const chunks = await databaseService.getDocumentChunks(docId);
    
    res.json({
      document,
      extracted_text: extractedText,
      chunks: chunks.map(chunk => ({
        chunk_id: chunk.chunk_id,
        chunk_index: chunk.chunk_index,
        word_count: chunk.word_count,
        char_count: chunk.char_count,
        section_name: chunk.section_name,
        heading: chunk.heading
      }))
    });
  } catch (error) {
    console.error('Get document details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/documents/:docId', extractUserId, async (req, res) => {
  try {
    const { docId } = req.params;
    await databaseService.deleteDocument(docId);
    
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Chunking configuration endpoints removed - using Pinecone Assistants


// Get statistics
router.get('/stats/:companyId', extractUserId, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const [documentStats, chunkStats] = await Promise.all([
      databaseService.getDocumentStats(companyId),
      databaseService.getChunkStats(companyId)
    ]);
    
    res.json({
      documents: documentStats,
      chunks: chunkStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual document processing (for testing)
router.post('/process/:docId', extractUserId, async (req, res) => {
  try {
    const { docId } = req.params;
    
    const result = await documentProcessor.processDocument(docId);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Manual processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue status
router.get('/queue/status', extractUserId, async (req, res) => {
  try {
    const status = await documentProcessor.getQueueStatus();
    
    res.json({ status });
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clean old jobs
router.post('/queue/clean', extractUserId, async (req, res) => {
  try {
    await documentProcessor.cleanOldJobs();
    
    res.json({ success: true, message: 'Old jobs cleaned' });
  } catch (error) {
    console.error('Clean jobs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/documents/:docId', extractUserId, async (req, res) => {
  try {
    const { docId } = req.params;
    await databaseService.deleteDocument(docId);
    
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Content Management API Endpoints

// Save website content
router.post('/knowledge-bases/:kbId/content/website', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { companyId, contentName, contentDescription, contentUrl, contentType } = req.body;
    
    if (!companyId || !contentName || !contentUrl) {
      return res.status(400).json({ error: 'Company ID, content name, and URL are required' });
    }

    // Create document record for website content
    const documentData = {
      doc_id: require('uuid').v4(),
      company_id: companyId,
      filename: contentName,
      original_filename: contentName,
      file_size: 0,
      file_path: '',
      content_name: contentName,
      content_description: contentDescription,
      content_type: contentType || 'website',
      content_url: contentUrl,
      status: 'ready',
      upload_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const document = await databaseService.createDocument(documentData);
    
    // Associate with knowledge base
    await databaseService.associateDocumentWithKnowledgeBase(document.doc_id, kbId);
    
    res.json({ 
      success: true, 
      document: {
        doc_id: document.doc_id,
        company_id: document.company_id,
        original_filename: document.original_filename,
        file_size: document.file_size,
        file_path: document.file_path,
        file_type: document.content_type,
        status: document.status,
        upload_timestamp: document.upload_timestamp,
        created_at: document.created_at,
        updated_at: document.updated_at,
        content_name: document.content_name,
        content_description: document.content_description,
        content_type: document.content_type,
        content_url: document.content_url
      }
    });
  } catch (error) {
    console.error('Save website content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save text content
router.post('/knowledge-bases/:kbId/content/text', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { companyId, contentName, contentDescription, contentText, contentType } = req.body;
    
    if (!companyId || !contentName || !contentText) {
      return res.status(400).json({ error: 'Company ID, content name, and text content are required' });
    }

    // Create document record for text content
    const documentData = {
      doc_id: require('uuid').v4(),
      company_id: companyId,
      filename: contentName,
      original_filename: contentName,
      file_size: contentText.length,
      file_path: '',
      content_name: contentName,
      content_description: contentDescription,
      content_type: contentType || 'text',
      content_text: contentText,
      status: 'ready',
      upload_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let document = await databaseService.createDocument(documentData);
    
    // Associate with knowledge base
    await databaseService.associateDocumentWithKnowledgeBase(document.doc_id, kbId);
    
    // Persist text content as file for ingestion
    try {
      document = await createTextFileForDocument(document, contentText);
    } catch (fileError) {
      console.error('Failed to prepare text file for document:', fileError);
      return res.status(500).json({ error: 'Failed to prepare text content for processing' });
    }

    // Trigger document processing to upload to Pinecone
    try {
      await documentProcessor.processDocument(document.doc_id);
    } catch (processError) {
      console.error('Text document processing error:', processError);
      // Continue without failing the response
    }
    
    res.json({ 
      success: true, 
      document: {
        doc_id: document.doc_id,
        company_id: document.company_id,
        original_filename: document.original_filename,
        file_size: document.file_size,
        file_path: document.file_path,
        file_type: document.content_type,
        status: document.status,
        upload_timestamp: document.upload_timestamp,
        created_at: document.created_at,
        updated_at: document.updated_at,
        content_name: document.content_name,
        content_description: document.content_description,
        content_type: document.content_type,
        content_text: document.content_text
      }
    });
  } catch (error) {
    console.error('Save text content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Context Snippets API Endpoints

// Get context snippets from a knowledge base
router.post('/knowledge-bases/:kbId/context', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { query, top_k, snippet_size, companyId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (top_k !== undefined) options.top_k = top_k;
    if (snippet_size !== undefined) options.snippet_size = snippet_size;

    const result = await contextService.getContextSnippets(companyId, kbId, query, options);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: result.code 
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get context snippets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get enhanced context snippets with metadata
router.post('/knowledge-bases/:kbId/context/enhanced', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { query, top_k, snippet_size, companyId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (top_k !== undefined) options.top_k = top_k;
    if (snippet_size !== undefined) options.snippet_size = snippet_size;

    const result = await contextService.getEnhancedContextSnippets(companyId, kbId, query, options);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: result.code 
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get enhanced context snippets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search multiple queries for context snippets
router.post('/knowledge-bases/:kbId/context/multi-search', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { queries, top_k, snippet_size, companyId } = req.body;
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: 'Queries array is required' });
    }
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (top_k !== undefined) options.top_k = top_k;
    if (snippet_size !== undefined) options.snippet_size = snippet_size;

    const result = await contextService.searchMultipleQueries(companyId, kbId, queries, options);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: result.code 
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Multi-search context snippets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get filtered context snippets
router.post('/knowledge-bases/:kbId/context/filtered', extractUserId, async (req, res) => {
  try {
    const { kbId } = req.params;
    const { query, filters, top_k, snippet_size, companyId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (top_k !== undefined) options.top_k = top_k;
    if (snippet_size !== undefined) options.snippet_size = snippet_size;

    const result = await contextService.getFilteredContextSnippets(
      companyId, 
      kbId, 
      query, 
      filters || {}, 
      options
    );
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: result.code 
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get filtered context snippets error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
