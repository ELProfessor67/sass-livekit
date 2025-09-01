import React, { useState } from "react";
import { Database, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { CreateKnowledgeBaseDialog } from "../dialogs/CreateKnowledgeBaseDialog";
import { KnowledgeBase } from "../types/knowledgeBase";
import { motion } from "framer-motion";
import { PageHeading, PageSubtext, SubHeading, SecondaryText } from "@/components/ui/typography";

const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: "1",
    name: "Product Documentation",
    description: "All product-related documentation and manuals",
    createdAt: "2024-01-15",
    subKnowledgeBases: [
      {
        id: "1-1",
        name: "User Manual",
        description: "Complete user guide",
        type: "document",
        status: "ready",
        files: [
          {
            id: "file-1",
            name: "user-manual.pdf",
            size: 2516582,
            type: "application/pdf",
            uploadedAt: "2024-01-15T10:00:00Z"
          }
        ],
        createdAt: "2024-01-15"
      },
      {
        id: "1-2",
        name: "API Documentation",
        description: "Technical API reference",
        type: "website",
        url: "https://docs.example.com/api",
        status: "ready",
        createdAt: "2024-01-14"
      }
    ]
  },
  {
    id: "2",
    name: "Customer Support",
    description: "FAQ, support articles, and customer communication templates",
    createdAt: "2024-01-10",
    subKnowledgeBases: [
      {
        id: "2-1",
        name: "FAQ Responses",
        description: "Common customer questions and answers",
        type: "text",
        content: "Sample FAQ content...",
        status: "ready",
        createdAt: "2024-01-13"
      }
    ]
  }
];

function SimplifiedKnowledgeBaseCard({ 
  knowledgeBase, 
  onEdit,
  onDelete
}: { 
  knowledgeBase: KnowledgeBase;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ThemeCard variant="default" className="group relative p-[var(--space-2xl)] transition-theme-base hover:shadow-[var(--shadow-glass-lg)]">
      {/* Hover Actions */}
      <div className="absolute top-[var(--space-lg)] right-[var(--space-lg)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-[var(--space-xs)]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(knowledgeBase.id)}
          className="h-8 w-8 p-0 hover:bg-primary/10"
        >
          <Pencil className="h-4 w-4 text-primary" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(knowledgeBase.id)}
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


export function KnowledgeBaseTab() {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState(mockKnowledgeBases);
  const [isCreateKBOpen, setIsCreateKBOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateKnowledgeBase = (newKB: Omit<KnowledgeBase, "id" | "createdAt" | "subKnowledgeBases">) => {
    const knowledgeBase: KnowledgeBase = {
      id: Date.now().toString(),
      ...newKB,
      createdAt: new Date().toISOString().split('T')[0],
      subKnowledgeBases: []
    };
    
    setKnowledgeBases(prev => [...prev, knowledgeBase]);
    
    toast({
      title: "Knowledge base created",
      description: `"${newKB.name}" has been created successfully.`,
    });
  };

  const handleEditKnowledgeBase = (knowledgeBaseId: string) => {
    navigate(`/assistants/knowledge-base/${knowledgeBaseId}/edit`);
  };

  const handleDeleteKnowledgeBase = (knowledgeBaseId: string) => {
    setKnowledgeBases(prev => prev.filter(kb => kb.id !== knowledgeBaseId));
    toast({
      title: "Knowledge base deleted",
      description: "The knowledge base and all its content has been removed.",
      variant: "destructive",
    });
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
            Create and manage hierarchical knowledge bases with organized content
          </PageSubtext>
        </div>
        <Button onClick={() => setIsCreateKBOpen(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge Base
        </Button>
      </div>

      {/* Knowledge Base Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-2xl)]">
        {knowledgeBases.length > 0 ? (
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
              />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full">
            <ThemeCard variant="default" className="text-center py-[var(--space-4xl)]">
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