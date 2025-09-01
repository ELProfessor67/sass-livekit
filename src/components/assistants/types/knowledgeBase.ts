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

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  subKnowledgeBases: SubKnowledgeBase[];
  isDeployed?: boolean;
  deployedAt?: string;
  totalFiles?: number;
  totalSize?: number;
}