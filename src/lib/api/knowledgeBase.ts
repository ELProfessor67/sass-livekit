import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserIdAsync } from '@/lib/user-context';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// Types for API responses
export interface DocumentUploadResponse {
  success: boolean;
  document: {
    doc_id: string;
    filename: string;
    file_size: number;
    status: string;
    upload_timestamp: string;
    content_name?: string;
    content_description?: string;
    content_type?: string;
  };
}

export interface Document {
  doc_id: string;
  company_id: string;
  original_filename: string;
  file_size: number;
  file_path: string;
  file_type?: string;
  status: string;
  pinecone_file_id?: string;
  pinecone_status?: 'uploaded' | 'processing' | 'ready' | 'failed' | 'error';
  pinecone_processed_at?: string;
  upload_timestamp: string;
  created_at: string;
  updated_at: string;
  // Content metadata fields
  content_name?: string;
  content_description?: string;
  content_type?: 'document' | 'website' | 'text';
  content_url?: string; // For website content
  content_text?: string; // For text content
}

export interface DocumentDetails {
  document: Document;
  extracted_text?: {
    raw_text: string;
    cleaned_text: string;
    extraction_method: string;
    confidence_score: number;
  };
  chunks: Array<{
    chunk_id: string;
    chunk_index: number;
    word_count: number;
    char_count: number;
    section_name?: string;
    heading?: string;
  }>;
}


export interface ChunkingConfig {
  chunk_size: number;
  overlap_percentage: number;
  min_chunk_size: number;
  max_chunk_size: number;
  use_token_based: boolean;
  model_name: string;
}


export interface KnowledgeBaseStats {
  documents: {
    total: number;
    uploaded: number;
    processing: number;
    ready: number;
    failed: number;
    error: number;
  };
  chunks: {
    total_chunks: number;
    total_words: number;
    total_characters: number;
    total_tokens: number;
    avg_words_per_chunk: number;
  };
}

export interface KnowledgeBase {
  id: string;
  company_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  knowledge_documents?: Document[];
}

// Context Snippets Types
export interface ContextSnippet {
  type: string;
  content: string;
  score: number;
  reference?: {
    type: string;
    file: {
      status: string;
      id: string;
      name: string;
      size: number;
      metadata: any;
      updated_on: string;
      created_on: string;
      percent_done: number;
      signed_url: string;
      error_message: string | null;
    };
    pages: number[];
  };
}

export interface ContextSnippetsResponse {
  success: boolean;
  snippets: ContextSnippet[];
  query: string;
  assistantName: string;
  options: {
    top_k: number;
    snippet_size: number;
  };
  error?: string;
  code?: string;
}

export interface EnhancedContextSnippet extends ContextSnippet {
  id: string;
  relevance_score: number;
  snippet_type: string;
  content_preview: string;
  has_reference: boolean;
  file_name: string;
  file_type: string;
  page_numbers: number[];
  file_size: number;
  file_status: string;
  created_at: string | null;
  updated_at: string | null;
  signed_url: string | null;
  signed_url_expires: string | null;
}

export interface EnhancedContextSnippetsResponse extends ContextSnippetsResponse {
  snippets: EnhancedContextSnippet[];
  total_snippets: number;
  average_relevance: number;
  file_types: string[];
  unique_files: number;
}

export interface MultiSearchContextSnippetsResponse {
  success: boolean;
  snippets: EnhancedContextSnippet[];
  total_snippets: number;
  queries_processed: number;
  successful_queries: number;
  average_relevance: number;
  file_types: string[];
  unique_files: number;
  error?: string;
  code?: string;
}

export interface ContextSnippetsFilters {
  file_types?: string[];
  file_names?: string[];
  min_relevance_score?: number;
  page_numbers?: number[];
}

export interface FilteredContextSnippetsResponse extends EnhancedContextSnippetsResponse {
  filters_applied: ContextSnippetsFilters;
  original_count: number;
}

// Helper function to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Use the current user ID (impersonated or authenticated)
  const userId = await getCurrentUserIdAsync();
  headers['user-id'] = userId;
  
  return headers;
}

// Helper function to get company ID from user
async function getCompanyId(): Promise<string> {
  return await getCurrentUserIdAsync();
}

// API service class
export class KnowledgeBaseAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Save website content to database
  async saveWebsiteContent(
    knowledgeBaseId: string,
    contentData: {
      name: string;
      description: string;
      url: string;
    },
    companyId?: string
  ): Promise<{ success: boolean; document: Document }> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${knowledgeBaseId}/content/website`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyId: id,
        contentName: contentData.name,
        contentDescription: contentData.description,
        contentUrl: contentData.url,
        contentType: 'website'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save website content: ${response.status}`);
    }

    return response.json();
  }

  // Save text content to database
  async saveTextContent(
    knowledgeBaseId: string,
    contentData: {
      name: string;
      description: string;
      text: string;
    },
    companyId?: string
  ): Promise<{ success: boolean; document: Document }> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${knowledgeBaseId}/content/text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyId: id,
        contentName: contentData.name,
        contentDescription: contentData.description,
        contentText: contentData.text,
        contentType: 'text'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save text content: ${response.status}`);
    }

    return response.json();
  }

  // Document upload
  async uploadDocument(
    file: File, 
    companyId?: string, 
    knowledgeBaseId?: string,
    contentMetadata?: {
      name?: string;
      description?: string;
      type?: 'document' | 'website' | 'text';
      url?: string;
      text?: string;
    }
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('document', file);
    
    if (companyId) {
      formData.append('companyId', companyId);
    } else {
      const id = await getCompanyId();
      formData.append('companyId', id);
    }

    if (knowledgeBaseId) {
      formData.append('knowledgeBaseId', knowledgeBaseId);
    }

    // Add content metadata
    if (contentMetadata) {
      if (contentMetadata.name) formData.append('contentName', contentMetadata.name);
      if (contentMetadata.description) formData.append('contentDescription', contentMetadata.description);
      if (contentMetadata.type) formData.append('contentType', contentMetadata.type);
      if (contentMetadata.url) formData.append('contentUrl', contentMetadata.url);
      if (contentMetadata.text) formData.append('contentText', contentMetadata.text);
    }

    const headers = await getAuthHeaders();
    // Remove Content-Type for FormData to let browser set it with boundary
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  // Get documents by company
  async getDocuments(companyId?: string): Promise<{ documents: Document[] }> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch documents: ${response.status}`);
    }

    return response.json();
  }

  // Get document status
  async getDocumentStatus(docId: string): Promise<{
    doc_id: string;
    status: string;
    filename: string;
    created_at: string;
    updated_at: string;
  }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents/${docId}/status`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch document status: ${response.status}`);
    }

    return response.json();
  }

  // Get document details
  async getDocumentDetails(docId: string): Promise<DocumentDetails> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents/${docId}/details`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch document details: ${response.status}`);
    }

    return response.json();
  }



  // Chunking configuration methods removed - using Pinecone Assistants


  // Get statistics
  async getStats(companyId?: string): Promise<KnowledgeBaseStats> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/stats/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch stats: ${response.status}`);
    }

    return response.json();
  }

  // Manual document processing
  async processDocument(docId: string): Promise<{ success: boolean; result: any }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/process/${docId}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to process document: ${response.status}`);
    }

    return response.json();
  }

  // Get queue status
  async getQueueStatus(): Promise<{ status: any }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/queue/status`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch queue status: ${response.status}`);
    }

    return response.json();
  }

  // Knowledge Base CRUD operations
  async createKnowledgeBase(name: string, description: string, companyId?: string): Promise<{ success: boolean; knowledgeBase: KnowledgeBase }> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyId: id,
        name,
        description
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create knowledge base: ${response.status}`);
    }

    return response.json();
  }

  async getKnowledgeBases(companyId?: string): Promise<{ knowledgeBases: KnowledgeBase[] }> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/company/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch knowledge bases: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  async getKnowledgeBase(kbId: string): Promise<{ knowledgeBase: KnowledgeBase }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch knowledge base: ${response.status}`);
    }

    const data = await response.json();
    
    // The response has { knowledgeBase: { ...knowledgeBase, documents: [...] } }
    return data;
  }

  async updateKnowledgeBase(kbId: string, updateData: Partial<KnowledgeBase>): Promise<{ success: boolean; knowledgeBase: KnowledgeBase }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update knowledge base: ${response.status}`);
    }

    return response.json();
  }

  async deleteKnowledgeBase(kbId: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete knowledge base: ${response.status}`);
    }

    return response.json();
  }

  async associateDocumentWithKnowledgeBase(docId: string, kbId: string): Promise<{ success: boolean; document: Document }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}/documents/${docId}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to associate document: ${response.status}`);
    }

    return response.json();
  }

  async deleteDocument(docId: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents/${docId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete document: ${response.status}`);
    }

    return response.json();
  }

  // SubKnowledgeBase CRUD operations
  async createSubKnowledgeBase(
    knowledgeBaseId: string,
    subKBData: {
      name: string;
      description: string;
      type: "document" | "website" | "text";
      url?: string;
      content?: string;
      files?: any[];
    }
  ): Promise<{ success: boolean; subKnowledgeBase: any }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${knowledgeBaseId}/sub-knowledge-bases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(subKBData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create sub-knowledge base: ${response.status}`);
    }

    return response.json();
  }

  async updateSubKnowledgeBase(
    knowledgeBaseId: string,
    subKBId: string,
    updateData: {
      name?: string;
      description?: string;
      url?: string;
      content?: string;
    }
  ): Promise<{ success: boolean; subKnowledgeBase: any }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${knowledgeBaseId}/sub-knowledge-bases/${subKBId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update sub-knowledge base: ${response.status}`);
    }

    return response.json();
  }

  async deleteSubKnowledgeBase(
    knowledgeBaseId: string,
    subKBId: string
  ): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${knowledgeBaseId}/sub-knowledge-bases/${subKBId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete sub-knowledge base: ${response.status}`);
    }

    return response.json();
  }

  // Context Snippets Methods

  /**
   * Get context snippets from a knowledge base
   */
  async getContextSnippets(
    kbId: string, 
    query: string, 
    options: { top_k?: number; snippet_size?: number } = {},
    companyId?: string
  ): Promise<ContextSnippetsResponse> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}/context`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        companyId: id,
        ...options
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get context snippets: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get enhanced context snippets with metadata
   */
  async getEnhancedContextSnippets(
    kbId: string, 
    query: string, 
    options: { top_k?: number; snippet_size?: number } = {},
    companyId?: string
  ): Promise<EnhancedContextSnippetsResponse> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}/context/enhanced`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        companyId: id,
        ...options
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get enhanced context snippets: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Search multiple queries for context snippets
   */
  async searchMultipleQueries(
    kbId: string, 
    queries: string[], 
    options: { top_k?: number; snippet_size?: number } = {},
    companyId?: string
  ): Promise<MultiSearchContextSnippetsResponse> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}/context/multi-search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        queries,
        companyId: id,
        ...options
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to search multiple queries: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get filtered context snippets
   */
  async getFilteredContextSnippets(
    kbId: string, 
    query: string, 
    filters: ContextSnippetsFilters = {},
    options: { top_k?: number; snippet_size?: number } = {},
    companyId?: string
  ): Promise<FilteredContextSnippetsResponse> {
    const id = companyId || await getCompanyId();
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge-base/knowledge-bases/${kbId}/context/filtered`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        filters,
        companyId: id,
        ...options
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get filtered context snippets: ${response.status}`);
    }

    return response.json();
  }

}

// Create a default instance
export const knowledgeBaseAPI = new KnowledgeBaseAPI();

// Export convenience functions
export const uploadDocument = (
  file: File, 
  companyId?: string, 
  knowledgeBaseId?: string,
  contentMetadata?: {
    name?: string;
    description?: string;
    type?: 'document' | 'website' | 'text';
    url?: string;
    text?: string;
  }
) => knowledgeBaseAPI.uploadDocument(file, companyId, knowledgeBaseId, contentMetadata);

export const getDocuments = (companyId?: string) => 
  knowledgeBaseAPI.getDocuments(companyId);

export const getDocumentStatus = (docId: string) => 
  knowledgeBaseAPI.getDocumentStatus(docId);

export const getDocumentDetails = (docId: string) => 
  knowledgeBaseAPI.getDocumentDetails(docId);

export const deleteDocument = (docId: string) => 
  knowledgeBaseAPI.deleteDocument(docId);

// SubKnowledgeBase convenience functions
export const createSubKnowledgeBase = (
  knowledgeBaseId: string,
  subKBData: {
    name: string;
    description: string;
    type: "document" | "website" | "text";
    url?: string;
    content?: string;
    files?: any[];
  }
) => knowledgeBaseAPI.createSubKnowledgeBase(knowledgeBaseId, subKBData);

export const updateSubKnowledgeBase = (
  knowledgeBaseId: string,
  subKBId: string,
  updateData: {
    name?: string;
    description?: string;
    url?: string;
    content?: string;
  }
) => knowledgeBaseAPI.updateSubKnowledgeBase(knowledgeBaseId, subKBId, updateData);

export const deleteSubKnowledgeBase = (
  knowledgeBaseId: string,
  subKBId: string
) => knowledgeBaseAPI.deleteSubKnowledgeBase(knowledgeBaseId, subKBId);


export const getStats = (companyId?: string) => 
  knowledgeBaseAPI.getStats(companyId);

export const createKnowledgeBase = (name: string, description: string, companyId?: string) => 
  knowledgeBaseAPI.createKnowledgeBase(name, description, companyId);

export const getKnowledgeBases = (companyId?: string) => 
  knowledgeBaseAPI.getKnowledgeBases(companyId);

export const getKnowledgeBase = (kbId: string) => 
  knowledgeBaseAPI.getKnowledgeBase(kbId);

export const updateKnowledgeBase = (kbId: string, updateData: Partial<KnowledgeBase>) => 
  knowledgeBaseAPI.updateKnowledgeBase(kbId, updateData);

export const deleteKnowledgeBase = (kbId: string) => 
  knowledgeBaseAPI.deleteKnowledgeBase(kbId);

export const associateDocumentWithKnowledgeBase = (docId: string, kbId: string) => 
  knowledgeBaseAPI.associateDocumentWithKnowledgeBase(docId, kbId);

// Context Snippets convenience functions
export const getContextSnippets = (
  kbId: string, 
  query: string, 
  options?: { top_k?: number; snippet_size?: number },
  companyId?: string
) => knowledgeBaseAPI.getContextSnippets(kbId, query, options, companyId);

export const getEnhancedContextSnippets = (
  kbId: string, 
  query: string, 
  options?: { top_k?: number; snippet_size?: number },
  companyId?: string
) => knowledgeBaseAPI.getEnhancedContextSnippets(kbId, query, options, companyId);

export const searchMultipleQueries = (
  kbId: string, 
  queries: string[], 
  options?: { top_k?: number; snippet_size?: number },
  companyId?: string
) => knowledgeBaseAPI.searchMultipleQueries(kbId, queries, options, companyId);

export const getFilteredContextSnippets = (
  kbId: string, 
  query: string, 
  filters?: ContextSnippetsFilters,
  options?: { top_k?: number; snippet_size?: number },
  companyId?: string
) => knowledgeBaseAPI.getFilteredContextSnippets(kbId, query, filters, options, companyId);

// Content saving convenience functions
export const saveWebsiteContent = (
  knowledgeBaseId: string,
  contentData: {
    name: string;
    description: string;
    url: string;
  },
  companyId?: string
) => knowledgeBaseAPI.saveWebsiteContent(knowledgeBaseId, contentData, companyId);

export const saveTextContent = (
  knowledgeBaseId: string,
  contentData: {
    name: string;
    description: string;
    text: string;
  },
  companyId?: string
) => knowledgeBaseAPI.saveTextContent(knowledgeBaseId, contentData, companyId);
