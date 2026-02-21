import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { PageHeading, PageSubtext, SubHeading, SecondaryText } from "@/components/ui/typography";
import {
  Upload,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowLeft,
  Plus,
  Globe,
  Type,
  Database
} from "lucide-react";
import {
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  uploadDocument,
  deleteDocument,
  saveWebsiteContent,
  saveTextContent
} from "@/lib/api/knowledgeBase";
import { KnowledgeBase } from "@/components/assistants/types/knowledgeBase";
import { Document } from "@/lib/api/knowledgeBase";
import { AddContentDialog } from "@/components/assistants/dialogs/AddContentDialog";

export default function KnowledgeBaseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [knowledgeBase, setKnowledgeBase] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Content management state
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);



  // Load knowledge base data
  useEffect(() => {
    const loadKnowledgeBase = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getKnowledgeBase(id);
        const kb: any = response.knowledgeBase;

        if (!kb) {
          throw new Error('Knowledge base not found');
        }

        // Convert API knowledge base to display format
        const displayKB = {
          id: kb.id,
          name: kb.name,
          description: kb.description || "",
          createdAt: kb.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          documents: kb.documents?.map(doc => ({
            doc_id: doc.doc_id,
            company_id: doc.company_id || "",
            original_filename: doc.original_filename,
            file_size: doc.file_size,
            file_path: doc.file_path || "",
            file_type: doc.file_type || doc.original_filename.split('.').pop() || 'unknown',
            status: doc.status,
            upload_timestamp: doc.upload_timestamp,
            created_at: doc.created_at,
            updated_at: doc.updated_at || doc.created_at,
            content_name: doc.content_name,
            content_description: doc.content_description,
            content_type: doc.content_type,
            content_url: doc.content_url,
            content_text: doc.content_text
          })) || []
        };
        setKnowledgeBase(displayKB);
      } catch (err) {
        console.error('Error loading knowledge base:', err);
        setError(err instanceof Error ? err.message : 'Failed to load knowledge base');
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeBase();
  }, [id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !id) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        // Upload the file
        console.log('Uploading file with knowledge base ID:', id);
        const uploadResponse = await uploadDocument(file, undefined, id);

        // Update local state with the new document
        const newDocument: Document = {
          doc_id: uploadResponse.document.doc_id,
          company_id: "", // Will be set by backend
          original_filename: uploadResponse.document.filename,
          file_size: uploadResponse.document.file_size,
          file_path: "", // Will be set by backend
          file_type: uploadResponse.document.filename.split('.').pop() || 'unknown',
          status: uploadResponse.document.status,
          upload_timestamp: uploadResponse.document.upload_timestamp,
          created_at: uploadResponse.document.upload_timestamp,
          updated_at: uploadResponse.document.upload_timestamp,
          content_name: uploadResponse.document.content_name,
          content_description: uploadResponse.document.content_description,
          content_type: (uploadResponse.document.content_type as "document" | "website" | "text") || "document"
        };

        setKnowledgeBase(prev => prev ? {
          ...prev,
          documents: [...prev.documents, newDocument]
        } : null);
      }

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!knowledgeBase) return;

    try {
      await deleteDocument(docId);

      // Update local state
      setKnowledgeBase(prev => prev ? {
        ...prev,
        documents: prev.documents.filter(doc => doc.doc_id !== docId)
      } : null);

      toast({
        title: "Document deleted",
        description: "The document has been removed from your knowledge base.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveName = async () => {
    if (!knowledgeBase || !editingName.trim()) return;

    try {
      await updateKnowledgeBase(knowledgeBase.id, { name: editingName.trim() });

      setKnowledgeBase(prev => prev ? {
        ...prev,
        name: editingName.trim()
      } : null);

      toast({
        title: "Name updated",
        description: "Knowledge base name has been updated.",
      });

      setEditingName("");
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!knowledgeBase || !editingDescription.trim()) return;

    try {
      await updateKnowledgeBase(knowledgeBase.id, { description: editingDescription.trim() });

      setKnowledgeBase(prev => prev ? {
        ...prev,
        description: editingDescription.trim()
      } : null);

      toast({
        title: "Description updated",
        description: "Knowledge base description has been updated.",
      });

      setEditingDescription("");
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
      toast({
        title: "Error",
        description: "Failed to update description. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKnowledgeBase = async () => {
    if (!knowledgeBase) return;

    try {
      await deleteKnowledgeBase(knowledgeBase.id);

      toast({
        title: "Knowledge base deleted",
        description: "The knowledge base has been deleted.",
      });

      navigate('/assistants?tab=knowledge-base');
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      toast({
        title: "Error",
        description: "Failed to delete knowledge base. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'uploaded':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        return <FileText className="h-4 w-4" />;
    }
  };



  const handleAddContent = async (contentData: {
    name: string;
    description: string;
    type: "document" | "website" | "text";
    url?: string;
    content?: string;
    files?: File[];
  }) => {
    try {
      if (contentData.type === "document" && contentData.files) {
        // Handle file uploads using existing functionality with metadata
        setUploading(true);
        for (const file of contentData.files) {
          const uploadResponse = await uploadDocument(
            file,
            undefined,
            id,
            {
              name: contentData.name,
              description: contentData.description,
              type: contentData.type
            }
          );

          const newDocument: Document = {
            doc_id: uploadResponse.document.doc_id,
            original_filename: uploadResponse.document.filename,
            file_size: uploadResponse.document.file_size,
            file_type: uploadResponse.document.filename.split('.').pop() || 'unknown',
            status: uploadResponse.document.status,
            upload_timestamp: uploadResponse.document.upload_timestamp,
            created_at: uploadResponse.document.upload_timestamp,
            // Add content metadata
            content_name: contentData.name,
            content_description: contentData.description,
            content_type: contentData.type
          } as Document;

          setKnowledgeBase(prev => prev ? {
            ...prev,
            documents: [...prev.documents, newDocument]
          } : null);
        }

        toast({
          title: "Content added",
          description: `${contentData.files.length} file(s) uploaded successfully.`,
        });
        setUploading(false);
      } else if (contentData.type === "website" && contentData.url) {
        // Handle website saving
        const response = await saveWebsiteContent(id!, {
          name: contentData.name,
          description: contentData.description,
          url: contentData.url
        });
        const websiteDoc: Document = {
          doc_id: response.document.doc_id,
          company_id: response.document.company_id || "",
          original_filename: response.document.original_filename,
          file_size: response.document.file_size,
          file_path: response.document.file_path || "",
          file_type: response.document.file_type || "website",
          status: response.document.status,
          upload_timestamp: response.document.upload_timestamp,
          created_at: response.document.created_at,
          updated_at: response.document.updated_at || response.document.created_at,
          content_name: response.document.content_name,
          content_description: response.document.content_description,
          content_type: response.document.content_type,
          content_url: response.document.content_url
        };
        setKnowledgeBase(prev => prev ? { ...prev, documents: [...prev.documents, websiteDoc] } : null);
        toast({ title: "Website added", description: "Website URL has been added to your knowledge base." });
      } else if (contentData.type === "text" && contentData.content) {
        // Handle text saving
        const response = await saveTextContent(id!, {
          name: contentData.name,
          description: contentData.description,
          text: contentData.content
        });
        const textDoc: Document = {
          doc_id: response.document.doc_id,
          company_id: response.document.company_id || "",
          original_filename: response.document.original_filename,
          file_size: response.document.file_size,
          file_path: response.document.file_path || "",
          file_type: response.document.file_type || "text",
          status: response.document.status,
          upload_timestamp: response.document.upload_timestamp,
          created_at: response.document.created_at,
          updated_at: response.document.updated_at || response.document.created_at,
          content_name: response.document.content_name,
          content_description: response.document.content_description,
          content_type: response.document.content_type,
          content_text: response.document.content_text
        };
        setKnowledgeBase(prev => prev ? { ...prev, documents: [...prev.documents, textDoc] } : null);
        toast({ title: "Text content added", description: "Text content has been added to your knowledge base." });
      }
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "Error",
        description: "Failed to add content. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <SecondaryText>Loading knowledge base...</SecondaryText>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <SecondaryText className="text-destructive mb-4">{error}</SecondaryText>
              <Button onClick={() => navigate('/assistants?tab=knowledge-base')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Knowledge Bases
              </Button>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  if (!knowledgeBase) {
    return null;
  }

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-6xl mx-auto">
            <ThemeSection spacing="lg">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-[var(--space-lg)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/assistants?tab=knowledge-base')}
                    className="flex-shrink-0 text-primary hover:text-primary/80"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <PageHeading>{knowledgeBase.name}</PageHeading>
                    <PageSubtext>Manage your knowledge base content</PageSubtext>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleDeleteKnowledgeBase}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>


              {/* Knowledge Sources Section */}
              <ThemeCard variant="glass">
                <div className="p-[var(--space-2xl)]">
                  <div className="flex justify-between items-center mb-[var(--space-2xl)]">
                    <SubHeading>Knowledge Sources ({knowledgeBase.documents?.length || 0})</SubHeading>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsAddContentOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Source
                    </Button>
                  </div>

                  {(!knowledgeBase.documents || knowledgeBase.documents.length === 0) ? (
                    <div className="text-center py-[var(--space-3xl)]">
                      <div className="space-y-[var(--space-lg)]">
                        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Database className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-foreground">No knowledge sources yet</h3>
                          <p className="text-muted-foreground mt-2">
                            Add your first piece of content to get started
                          </p>
                        </div>
                        <Button
                          onClick={() => setIsAddContentOpen(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Source
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-lg)]">
                      {knowledgeBase.documents.map((doc: Document) => (
                        <div
                          key={doc.doc_id}
                          className="group relative flex flex-col p-[var(--space-lg)] rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc.doc_id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                            {getTabIcon(doc.content_type || 'document')}
                          </div>

                          <div className="font-medium text-base text-white mb-1 truncate">
                            {doc.content_name || doc.original_filename}
                          </div>

                          <div className="text-sm text-white/50 mb-6 line-clamp-2 min-h-[40px]">
                            {doc.content_description || "No description"}
                          </div>

                          <div className="mt-auto">
                            <Badge variant="secondary" className="bg-white/5 text-white/70 hover:bg-white/10 border-0 rounded-full px-3 font-normal">
                              {doc.content_type ? doc.content_type.charAt(0).toUpperCase() + doc.content_type.slice(1) : 'Document'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ThemeCard>

            </ThemeSection>
          </div>
        </div>
      </ThemeContainer>

      {/* Add Content Dialog */}
      <AddContentDialog
        open={isAddContentOpen}
        onOpenChange={setIsAddContentOpen}
        onAddContent={handleAddContent}
      />
    </DashboardLayout>
  );
}