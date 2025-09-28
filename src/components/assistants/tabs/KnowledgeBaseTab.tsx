import React, { useState } from "react";
import { Database, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { CreateKnowledgeBaseDialog } from "../dialogs/CreateKnowledgeBaseDialog";
import { KnowledgeBase } from "../types/knowledgeBase";
import { motion } from "framer-motion";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Document, KnowledgeBase as APIKnowledgeBase } from "@/lib/api/knowledgeBase";
import { PageHeading, PageSubtext, SubHeading, SecondaryText } from "@/components/ui/typography";

// Convert API KnowledgeBase to display format
const convertAPIKnowledgeBaseToDisplay = (apiKB: APIKnowledgeBase): KnowledgeBase => {
  return {
    id: apiKB.id,
    name: apiKB.name,
    description: apiKB.description,
    createdAt: apiKB.created_at.split('T')[0],
    subKnowledgeBases: (apiKB.knowledge_documents || []).map((doc) => ({
      id: doc.doc_id,
      name: doc.original_filename,
      description: `File size: ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`,
      type: "document" as const,
      status: doc.status === 'EMBEDDED' ? 'ready' as const : 
              doc.status === 'ERROR' ? 'error' as const : 'processing' as const,
      files: [{
        id: doc.doc_id,
        name: doc.original_filename,
        size: doc.file_size,
        type: doc.original_filename.split('.').pop() || 'unknown',
        uploadedAt: doc.upload_timestamp
      }],
      createdAt: doc.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    }))
  };
};

function SimplifiedKnowledgeBaseCard({ 
  knowledgeBase, 
  onEdit,
  onDelete,
  onClick
}: { 
  knowledgeBase: KnowledgeBase;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}) {
  return (
    <ThemeCard 
      variant="glass" 
      className="group relative p-[var(--space-2xl)] transition-theme-base hover:shadow-[var(--shadow-glass-lg)] cursor-pointer"
      onClick={() => onClick(knowledgeBase.id)}
    >
      {/* Hover Actions */}
      <div className="absolute top-[var(--space-lg)] right-[var(--space-lg)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-[var(--space-xs)]">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(knowledgeBase.id);
          }}
          className="h-8 w-8 p-0 hover:bg-primary/10"
        >
          <Pencil className="h-4 w-4 text-primary" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(knowledgeBase.id);
          }}
          className="h-8 w-8 p-0 hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex items-start space-x-[var(--space-lg)]">
        <div className="p-[var(--space-md)] rounded-lg bg-primary/10 flex-shrink-0">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-[var(--space-md)]">
          <SubHeading className="truncate">
            {knowledgeBase.name}
          </SubHeading>
          <SecondaryText className="line-clamp-2">
            {knowledgeBase.description}
          </SecondaryText>
          <div className="flex items-center space-x-[var(--space-lg)] pt-[var(--space-sm)]">
            <Badge variant="outline" className="text-xs font-medium">
              {knowledgeBase.subKnowledgeBases.length} items
            </Badge>
            <SecondaryText className="text-xs">
              Created {new Date(knowledgeBase.createdAt).toLocaleDateString()}
            </SecondaryText>
          </div>
        </div>
      </div>
    </ThemeCard>
  );
}


interface KnowledgeBaseTabProps {
  tabChangeTrigger?: number;
}

export function KnowledgeBaseTab({ tabChangeTrigger = 0 }: KnowledgeBaseTabProps) {
  const navigate = useNavigate();
  const [isCreateKBOpen, setIsCreateKBOpen] = useState(false);
  const { toast } = useToast();
  
  // Use the knowledge base hook
  const {
    knowledgeBases: apiKnowledgeBases,
    loading,
    error,
    stats,
    uploadDocument,
    deleteDocument,
    createKnowledgeBase,
    deleteKnowledgeBase,
    refresh
  } = useKnowledgeBase({ autoRefresh: true });
  
  // Convert API knowledge bases to display format
  const knowledgeBases = apiKnowledgeBases.map(convertAPIKnowledgeBaseToDisplay);

  const handleCreateKnowledgeBase = async (newKB: Omit<KnowledgeBase, "id" | "createdAt" | "subKnowledgeBases">) => {
    try {
      const createdKB = await createKnowledgeBase(newKB.name, newKB.description);
      return createdKB.id;
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to create knowledge base:', error);
      throw error;
    }
  };

  const handleViewKnowledgeBase = (knowledgeBaseId: string) => {
    navigate(`/assistants/knowledge-base/${knowledgeBaseId}/edit`);
  };

  const handleEditKnowledgeBase = (knowledgeBaseId: string) => {
    navigate(`/assistants/knowledge-base/${knowledgeBaseId}/edit`);
  };

  const handleDeleteKnowledgeBase = async (knowledgeBaseId: string) => {
    try {
      await deleteKnowledgeBase(knowledgeBaseId);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to delete knowledge base:', error);
    }
  };

  return (
    <div className="space-y-[var(--space-3xl)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-xl)]">
        <div className="space-y-[var(--space-md)]">
          <PageHeading>
            Knowledge Base
          </PageHeading>
          <PageSubtext>
            Upload and manage documents for your AI assistants
          </PageSubtext>
          {stats && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{stats.documents.total} documents</span>
              <span>{stats.chunks.total_chunks} chunks</span>
              <span>{stats.documents.embedded} ready</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refresh()} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
          <Button onClick={() => setIsCreateKBOpen(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Knowledge Base
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button 
            onClick={() => refresh()} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Knowledge Base Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-2xl)]">
        {loading && knowledgeBases.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading documents...</span>
          </div>
        ) : knowledgeBases.length > 0 ? (
          knowledgeBases.map((kb) => (
            <motion.div
              key={kb.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SimplifiedKnowledgeBaseCard 
                knowledgeBase={kb}
                onEdit={handleEditKnowledgeBase}
                onDelete={handleDeleteKnowledgeBase}
                onClick={handleViewKnowledgeBase}
              />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full">
            <ThemeCard variant="glass" className="text-center py-[var(--space-4xl)]">
              <div className="p-[var(--space-2xl)] space-y-[var(--space-xl)]">
                <Database className="h-12 w-12 text-muted-foreground mx-auto" />
                <div className="space-y-[var(--space-md)]">
                  <SubHeading>
                    No knowledge bases created
                  </SubHeading>
                  <SecondaryText>
                    Create your first knowledge base to organize your content and information
                  </SecondaryText>
                </div>
                <Button onClick={() => setIsCreateKBOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Knowledge Base
                </Button>
              </div>
            </ThemeCard>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateKnowledgeBaseDialog
        open={isCreateKBOpen}
        onOpenChange={setIsCreateKBOpen}
        onCreateKnowledgeBase={handleCreateKnowledgeBase}
      />
    </div>
  );
}