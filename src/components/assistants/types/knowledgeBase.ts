

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  content?: string;
}

export interface SubKnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: "document" | "website" | "text";
  status: "processing" | "ready" | "error";
  url?: string;
  content?: string;
  scrapedContent?: string;
  files?: FileMetadata[];
  createdAt: string;
  progress?: number;
}

export interface Document {
  doc_id: string;
  original_filename: string;
  file_size: number;
  file_type?: string;
  status: string;
  upload_timestamp: string;
  created_at: string;
  // Content metadata fields
  content_name?: string;
  content_description?: string;
  content_type?: 'document' | 'website' | 'text';
  content_url?: string; // For website content
  content_text?: string; // For text content
  pinecone_status?: 'uploaded' | 'processing' | 'ready' | 'failed' | 'error';
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  subKnowledgeBases: SubKnowledgeBase[];
  documents: Document[]; // Keep for backward compatibility
  isDeployed?: boolean;
  deployedAt?: string;
  totalFiles?: number;
  totalSize?: number;
}