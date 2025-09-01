import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Database, Plus, Sparkles, FileText, Globe, Type, Trash2, Upload } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer, ThemeCard } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { CreateSubKnowledgeBaseDialog } from "@/components/assistants/dialogs/CreateSubKnowledgeBaseDialog";
import { FileUploadArea } from "@/components/assistants/components/FileUploadArea";
import { KnowledgeBase, SubKnowledgeBase, FileMetadata } from "@/components/assistants/types/knowledgeBase";
import { motion } from "framer-motion";

// Mock data - in real app this would come from API
const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: "1",
    name: "Sales Training Materials",
    description: "Comprehensive sales training resources and documentation",
    createdAt: "2024-01-15",
    subKnowledgeBases: [
      {
        id: "1-1",
        name: "Sales Scripts",
        description: "Call scripts and conversation guides",
        type: "document",
        status: "ready",
        files: [
          {
            id: "file-1",
            name: "sales-scripts.pdf",
            size: 2516582,
            type: "application/pdf",
            uploadedAt: "2024-01-15T10:00:00Z"
          }
        ],
        createdAt: "2024-01-15"
      },
      {
        id: "1-2",
        name: "Product Catalog",
        description: "Latest product information and pricing",
        type: "website",
        url: "https://catalog.example.com",
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

export default function KnowledgeBaseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(
    mockKnowledgeBases.find(kb => kb.id === id) || null
  );
  const [isCreateSubKBOpen, setIsCreateSubKBOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("0");
  
  // Form states for editing
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingUrl, setEditingUrl] = useState("");
  
  // Master KB editing states
  const [masterName, setMasterName] = useState("");
  const [masterDescription, setMasterDescription] = useState("");

  if (!knowledgeBase) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base">
          <div className="container mx-auto px-[var(--space-lg)] py-12">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-2">Knowledge Base Not Found</h1>
              <Button onClick={() => navigate("/assistants")} variant="outline">
                Go Back
              </Button>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  const handleCreateSubKnowledgeBase = (newSubKB: Omit<SubKnowledgeBase, "id" | "createdAt" | "status">) => {
    const subKnowledgeBase: SubKnowledgeBase = {
      id: Date.now().toString(),
      ...newSubKB,
      createdAt: new Date().toISOString().split('T')[0],
      status: newSubKB.type === "website" ? "processing" : "ready"
    };
    
    setKnowledgeBase(prev => prev ? {
      ...prev,
      subKnowledgeBases: [...prev.subKnowledgeBases, subKnowledgeBase]
    } : null);

    // Set the new tab as active
    setActiveTab((knowledgeBase.subKnowledgeBases.length).toString());

    toast({
      title: "Content added",
      description: `"${newSubKB.name}" has been added to your knowledge base.`,
    });
  };

  const handleDeleteSubKnowledgeBase = (subId: string) => {
    const subIndex = knowledgeBase.subKnowledgeBases.findIndex(sub => sub.id === subId);
    
    setKnowledgeBase(prev => prev ? {
      ...prev,
      subKnowledgeBases: prev.subKnowledgeBases.filter(sub => sub.id !== subId)
    } : null);

    // Adjust active tab if needed
    if (activeTab === subIndex.toString() && knowledgeBase.subKnowledgeBases.length > 1) {
      setActiveTab("0");
    }

    toast({
      title: "Content deleted",
      description: "The content has been removed from your knowledge base.",
      variant: "destructive",
    });
  };

  const handleDeploy = () => {
    toast({
      title: "Deploying knowledge base",
      description: "Your knowledge base is being deployed...",
    });
  };

  const handleSaveContent = () => {
    const activeSubKB = knowledgeBase.subKnowledgeBases[parseInt(activeTab)];
    if (activeSubKB && (editingName || editingDescription || editingUrl)) {
      setKnowledgeBase(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        updated.subKnowledgeBases[parseInt(activeTab)] = {
          ...activeSubKB,
          name: editingName || activeSubKB.name,
          description: editingDescription || activeSubKB.description,
          url: editingUrl || activeSubKB.url
        };
        return updated;
      });

      toast({
        title: "Content updated",
        description: "Your changes have been saved.",
      });

      setEditingName("");
      setEditingDescription("");
      setEditingUrl("");
    }
  };

  const handleSaveMasterKB = () => {
    if (masterName || masterDescription) {
      setKnowledgeBase(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: masterName || prev.name,
          description: masterDescription || prev.description
        };
      });

      toast({
        title: "Knowledge base updated",
        description: "Master knowledge base has been updated.",
      });

      setMasterName("");
      setMasterDescription("");
    }
  };

  const handleDeleteKnowledgeBase = () => {
    toast({
      title: "Knowledge base deleted",
      description: "The knowledge base has been deleted.",
      variant: "destructive",
    });
    navigate("/assistants");
  };

  const handleFilesAdd = (newFiles: FileMetadata[]) => {
    const activeSubKB = knowledgeBase?.subKnowledgeBases[parseInt(activeTab)];
    if (activeSubKB) {
      setKnowledgeBase(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        updated.subKnowledgeBases[parseInt(activeTab)] = {
          ...activeSubKB,
          files: [...(activeSubKB.files || []), ...newFiles]
        };
        return updated;
      });
    }
  };

  const handleFileDelete = (fileId: string) => {
    const activeSubKB = knowledgeBase?.subKnowledgeBases[parseInt(activeTab)];
    if (activeSubKB) {
      setKnowledgeBase(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        updated.subKnowledgeBases[parseInt(activeTab)] = {
          ...activeSubKB,
          files: activeSubKB.files?.filter(f => f.id !== fileId) || []
        };
        return updated;
      });
    }
  };

  const handleFilePreview = (file: FileMetadata) => {
    toast({
      title: "File preview",
      description: `Opening preview for ${file.name}`,
    });
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "website":
        return <Globe className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const activeSubKB = knowledgeBase.subKnowledgeBases[parseInt(activeTab)];

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" spacing="lg">
        {/* Simplified Header */}
        <div className="flex justify-between items-center mb-[var(--space-2xl)]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {knowledgeBase.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {knowledgeBase.description}
            </p>
          </div>
          <Button 
            onClick={handleDeploy}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Deploy
          </Button>
        </div>

        {/* Master Knowledge Base Header Card */}
        <ThemeCard variant="glass-light" className="p-[var(--space-lg)] mb-[var(--space-2xl)]">
          <div className="flex items-start space-x-[var(--space-lg)]">
            <div className="group relative">
              <div className="p-2 rounded-md bg-primary/10 dark:bg-primary/20 cursor-help">
                <Database className="h-5 w-5 text-primary" />
              </div>
              {/* Hover tooltip for metadata */}
              <div className="absolute left-0 top-full mt-2 bg-popover border border-border rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{knowledgeBase.subKnowledgeBases.length} sub-items</div>
                  <div>Created {new Date(knowledgeBase.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-[var(--space-md)]">
              <div className="flex items-center space-x-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Knowledge Base Settings
                </Badge>
              </div>
              
              {/* Editable Name */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Name</Label>
                <Input
                  placeholder="Enter knowledge base name..."
                  value={masterName || knowledgeBase.name}
                  onChange={(e) => setMasterName(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>
              
              {/* Editable Description */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Description</Label>
                <Textarea
                  placeholder="Describe when to use this knowledge base..."
                  value={masterDescription || knowledgeBase.description}
                  onChange={(e) => setMasterDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
              
              {(masterName || masterDescription) && (
                <Button onClick={handleSaveMasterKB} size="sm">
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </ThemeCard>

        {/* Minimalist Tab System */}
        {knowledgeBase.subKnowledgeBases.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Clean tab container */}
            <div className="border-b border-border mb-[var(--space-2xl)]">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <TabsList className="h-auto p-0 bg-transparent justify-start inline-flex">
                    {knowledgeBase.subKnowledgeBases.map((subKB, index) => (
                      <TabsTrigger 
                        key={subKB.id} 
                        value={index.toString()}
                        className="group relative data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent flex items-center space-x-2 px-[var(--space-lg)] py-3 rounded-none border-b-2 border-transparent hover:border-muted-foreground/30 transition-colors whitespace-nowrap"
                      >
                        {getTabIcon(subKB.type)}
                        <span className="truncate max-w-[140px]">{subKB.name}</span>
                        
                        {/* Hover tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-popover border border-border rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="text-xs text-muted-foreground space-y-1 whitespace-nowrap">
                            <div>Type: {subKB.type}</div>
                            <div>Status: {subKB.status}</div>
                            <div>Files: {subKB.files?.length || 0}</div>
                            <div>Created: {new Date(subKB.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div className="pl-[var(--space-lg)] py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateSubKBOpen(true)}
                    className="h-10 px-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                </div>
              </div>
            </div>

            {/* Simplified Tab Content */}
            {knowledgeBase.subKnowledgeBases.map((subKB, index) => (
              <TabsContent key={subKB.id} value={index.toString()} className="mt-0">
                <div className="space-y-6">
                  {/* Single Content Editing Area */}
                  <ThemeCard variant="glass" className="p-[var(--space-xl)]">
                    <div className="space-y-[var(--space-lg)]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
                        {/* Name Input */}
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium text-foreground">
                            Name
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter content name..."
                            value={editingName || subKB.name}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        
                        {/* URL Input for Website Type */}
                        {subKB.type === "website" && (
                          <div>
                            <Label htmlFor="url" className="text-sm font-medium text-foreground">
                              Website URL
                            </Label>
                            <Input
                              id="url"
                              placeholder="https://example.com"
                              value={editingUrl || subKB.url}
                              onChange={(e) => setEditingUrl(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Description */}
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-foreground">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe this content..."
                          value={editingDescription || subKB.description}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="min-h-[80px] mt-1"
                        />
                      </div>
                      
                      {/* File Upload Section for Document Type - Integrated */}
                      {subKB.type === "document" && (
                        <div className="pt-[var(--space-lg)] border-t border-border">
                          <FileUploadArea
                            files={subKB.files || []}
                            onFilesAdd={handleFilesAdd}
                            onFileDelete={handleFileDelete}
                            onFilePreview={handleFilePreview}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-[var(--space-lg)]">
                        {(editingName || editingDescription || editingUrl) && (
                          <Button onClick={handleSaveContent}>
                            Save Changes
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSubKnowledgeBase(subKB.id)}
                          className="ml-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </ThemeCard>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-[var(--space-3xl)]">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-[var(--space-lg)]" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Content Yet</h3>
            <p className="text-sm text-muted-foreground mb-[var(--space-xl)]">
              Start building your knowledge base by adding your first piece of content.
            </p>
            <Button onClick={() => setIsCreateSubKBOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Content
            </Button>
          </div>
        )}

        {/* Delete Knowledge Base Button */}
        <div className="pt-[var(--space-2xl)] border-t border-border mt-[var(--space-3xl)]">
          <Button 
            onClick={handleDeleteKnowledgeBase}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Knowledge Base
          </Button>
        </div>

        <CreateSubKnowledgeBaseDialog
          open={isCreateSubKBOpen}
          onOpenChange={setIsCreateSubKBOpen}
          onCreateSubKnowledgeBase={handleCreateSubKnowledgeBase}
        />
      </ThemeContainer>
    </DashboardLayout>
  );
}