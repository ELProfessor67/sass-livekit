import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  knowledgeBaseAPI, 
  Document, 
  DocumentDetails, 
  KnowledgeBaseStats,
  ChunkingConfig,
  KnowledgeBase
} from '@/lib/api/knowledgeBase';

export interface UseKnowledgeBaseOptions {
  companyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useKnowledgeBase(options: UseKnowledgeBaseOptions = {}) {
  const { companyId, autoRefresh = false, refreshInterval = 30000 } = options;
  const { toast } = useToast();
  
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [chunkingConfig, setChunkingConfig] = useState<ChunkingConfig | null>(null);

  // Error handler
  const handleError = useCallback((error: any, operation: string) => {
    const message = error?.message || `Failed to ${operation}`;
    setError(message);
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
    console.error(`Knowledge Base ${operation} error:`, error);
  }, [toast]);

  // Success handler
  const handleSuccess = useCallback((message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  }, [toast]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBaseAPI.getDocuments(companyId);
      setDocuments(response.documents);
    } catch (error) {
      handleError(error, 'load documents');
    } finally {
      setLoading(false);
    }
  }, [companyId, handleError]);

  // Load knowledge bases
  const loadKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading knowledge bases for company:', companyId);
      const response = await knowledgeBaseAPI.getKnowledgeBases(companyId);
      console.log('Knowledge bases response:', response);
      setKnowledgeBases(response.knowledgeBases || []);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
      handleError(error, 'load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, [companyId, handleError]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await knowledgeBaseAPI.getStats(companyId);
      setStats(response);
    } catch (error) {
      handleError(error, 'load stats');
    }
  }, [companyId, handleError]);

  // Load configurations - removed since we use Pinecone Assistants
  const loadConfigurations = useCallback(async () => {
    // No longer needed with Pinecone Assistants
    setChunkingConfig(null);
  }, []);

  // Upload document
  const uploadDocument = useCallback(async (file: File, knowledgeBaseId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBaseAPI.uploadDocument(file, companyId, knowledgeBaseId);
      handleSuccess(`Document "${response.document.filename}" uploaded successfully`);
      
      // Refresh documents list and knowledge bases
      await loadDocuments();
      await loadKnowledgeBases();
      await loadStats();
      
      return response;
    } catch (error) {
      handleError(error, 'upload document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId, handleError, handleSuccess, loadDocuments, loadKnowledgeBases, loadStats]);

  // Delete document
  const deleteDocument = useCallback(async (docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeBaseAPI.deleteDocument(docId);
      handleSuccess('Document deleted successfully');
      
      // Refresh documents list
      await loadDocuments();
      await loadStats();
    } catch (error) {
      handleError(error, 'delete document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess, loadDocuments, loadStats]);

  // Get document details
  const getDocumentDetails = useCallback(async (docId: string): Promise<DocumentDetails> => {
    try {
      setError(null);
      return await knowledgeBaseAPI.getDocumentDetails(docId);
    } catch (error) {
      handleError(error, 'get document details');
      throw error;
    }
  }, [handleError]);


  // Process document manually
  const processDocument = useCallback(async (docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeBaseAPI.processDocument(docId);
      handleSuccess('Document processing started');
      
      // Refresh documents list after a short delay
      setTimeout(() => {
        loadDocuments();
        loadStats();
      }, 2000);
    } catch (error) {
      handleError(error, 'process document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess, loadDocuments, loadStats]);

  // Update chunking configuration - removed since we use Pinecone Assistants
  const updateChunkingConfig = useCallback(async (config: Partial<ChunkingConfig>) => {
    // No longer needed with Pinecone Assistants
    console.warn('Chunking configuration is no longer used with Pinecone Assistants');
  }, []);


  // Get document status
  const getDocumentStatus = useCallback(async (docId: string) => {
    try {
      setError(null);
      return await knowledgeBaseAPI.getDocumentStatus(docId);
    } catch (error) {
      handleError(error, 'get document status');
      throw error;
    }
  }, [handleError]);

  // Knowledge Base CRUD operations
  const createKnowledgeBase = useCallback(async (name: string, description: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBaseAPI.createKnowledgeBase(name, description, companyId);
      handleSuccess(`Knowledge base "${name}" created successfully`);
      
      // Refresh knowledge bases list
      await loadKnowledgeBases();
      
      return response.knowledgeBase;
    } catch (error) {
      handleError(error, 'create knowledge base');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId, handleError, handleSuccess, loadKnowledgeBases]);

  const updateKnowledgeBase = useCallback(async (kbId: string, updateData: Partial<KnowledgeBase>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBaseAPI.updateKnowledgeBase(kbId, updateData);
      handleSuccess('Knowledge base updated successfully');
      
      // Refresh knowledge bases list
      await loadKnowledgeBases();
      
      return response.knowledgeBase;
    } catch (error) {
      handleError(error, 'update knowledge base');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess, loadKnowledgeBases]);

  const deleteKnowledgeBase = useCallback(async (kbId: string) => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeBaseAPI.deleteKnowledgeBase(kbId);
      handleSuccess('Knowledge base deleted successfully');
      
      // Refresh knowledge bases list
      await loadKnowledgeBases();
    } catch (error) {
      handleError(error, 'delete knowledge base');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess, loadKnowledgeBases]);

  const associateDocumentWithKnowledgeBase = useCallback(async (docId: string, kbId: string) => {
    try {
      setError(null);
      const response = await knowledgeBaseAPI.associateDocumentWithKnowledgeBase(docId, kbId);
      handleSuccess('Document associated with knowledge base successfully');
      
      // Refresh knowledge bases list
      await loadKnowledgeBases();
      
      return response.document;
    } catch (error) {
      handleError(error, 'associate document with knowledge base');
      throw error;
    }
  }, [handleError, handleSuccess, loadKnowledgeBases]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadDocuments(),
      loadKnowledgeBases(),
      loadStats(),
      loadConfigurations()
    ]);
  }, [loadDocuments, loadKnowledgeBases, loadStats, loadConfigurations]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // State
    documents,
    knowledgeBases,
    loading,
    error,
    stats,
    chunkingConfig,
    
    // Actions
    uploadDocument,
    deleteDocument,
    getDocumentDetails,
    processDocument,
    updateChunkingConfig,
    getDocumentStatus,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    associateDocumentWithKnowledgeBase,
    refresh,
    loadDocuments,
    loadKnowledgeBases,
    loadStats,
    loadConfigurations,
    
    // Utilities
    clearError: () => setError(null),
  };
}

// Hook for document processing status
export function useDocumentProcessing(docId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    if (!docId) return;
    
    try {
      setLoading(true);
      const response = await knowledgeBaseAPI.getDocumentStatus(docId);
      setStatus(response.status);
    } catch (error) {
      console.error('Failed to check document status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check document status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [docId, toast]);

  useEffect(() => {
    if (docId) {
      checkStatus();
      // Poll for status updates every 5 seconds
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [docId, checkStatus]);

  return {
    status,
    loading,
    checkStatus,
    isProcessing: status === 'uploaded' || status === 'processing',
    isComplete: status === 'ready',
    hasError: status === 'failed' || status === 'error',
  };
}
