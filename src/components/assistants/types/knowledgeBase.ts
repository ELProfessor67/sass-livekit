

export interface Document {
  doc_id: string;
  original_filename: string;
  file_size: number;
  file_type?: string;
  status: string;
  upload_timestamp: string;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  documents: Document[];
  isDeployed?: boolean;
  deployedAt?: string;
  totalFiles?: number;
  totalSize?: number;
}