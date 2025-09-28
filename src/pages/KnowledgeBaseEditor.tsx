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
  
  // Tab-based UI state
  const [activeTab, setActiveTab] = useState<"documents" | "websites" | "text">("documents");
  
  // Get available tabs based on content
  const getAvailableTabs = () => {
    if (!knowledgeBase?.documents) return [];
    
    const tabs = [];
    const documents = getDocumentsByType("documents");
    const websites = getDocumentsByType("websites");
    const text = getDocumentsByType("text");
    
    if (documents.length > 0) tabs.push({ key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> });
    if (websites.length > 0) tabs.push({ key: "websites", label: "Websites", icon: <Globe className="h-4 w-4" /> });
    if (text.length > 0) tabs.push({ key: "text", label: "Text", icon: <Type className="h-4 w-4" /> });
    
    return tabs;
  };
  
  // Set active tab to first available tab if current tab has no content
  useEffect(() => {
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key as "documents" | "websites" | "text");
    }
  }, [knowledgeBase?.documents]);
  
  // Content editing state
  const [editingContent, setEditingContent] = useState<{
    name: string;
    description: string;
    url?: string;
    text?: string;
  }>({
    name: "",
    description: "",
    url: "",
    text: ""
  });

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

  // Helper functions for content categorization
  const getDocumentsByType = (type: "documents" | "websites" | "text") => {
    if (!knowledgeBase?.documents) return [];
    
    return knowledgeBase.documents.filter((doc: Document) => {
      switch (type) {
        case "documents":
          return doc.content_type === "document" || !doc.content_type;
        case "websites":
          return doc.content_type === "website";
        case "text":
          return doc.content_type === "text";
        default:
          return false;
      }
    });
  };

  const handleSaveWebsite = async () => {
    if (!knowledgeBase || !editingContent.name.trim() || !editingContent.url?.trim()) return;
    
    try {
      // Save website content to database
      const response = await saveWebsiteContent(knowledgeBase.id, {
        name: editingContent.name.trim(),
        description: editingContent.description.trim(),
        url: editingContent.url.trim()
      });

      // Add the saved document to local state
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

      setKnowledgeBase(prev => prev ? {
        ...prev,
        documents: [...prev.documents, websiteDoc]
      } : null);

      toast({
        title: "Website added",
        description: "Website URL has been added to your knowledge base.",
      });

      setEditingContent({ name: "", description: "", url: "", text: "" });
    } catch (error) {
      console.error('Failed to save website:', error);
      toast({
        title: "Error",
        description: "Failed to save website. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveText = async () => {
    if (!knowledgeBase || !editingContent.name.trim() || !editingContent.text?.trim()) return;
    
    try {
      // Save text content to database
      const response = await saveTextContent(knowledgeBase.id, {
        name: editingContent.name.trim(),
        description: editingContent.description.trim(),
        text: editingContent.text.trim()
      });

      // Add the saved document to local state
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

      setKnowledgeBase(prev => prev ? {
        ...prev,
        documents: [...prev.documents, textDoc]
      } : null);

      toast({
        title: "Text content added",
        description: "Text content has been added to your knowledge base.",
      });

      setEditingContent({ name: "", description: "", url: "", text: "" });
    } catch (error) {
      console.error('Failed to save text content:', error);
      toast({
        title: "Error",
        description: "Failed to save text content. Please try again.",
        variant: "destructive",
      });
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
      } else if (contentData.type === "website") {
        // TODO: Implement website scraping
        toast({
          title: "Website content",
          description: "Website content feature coming soon!",
        });
      } else if (contentData.type === "text") {
        // TODO: Implement text content storage
        toast({
          title: "Text content",
          description: "Text content feature coming soon!",
        });
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
                    size="icon"
                    onClick={() => navigate('/assistants?tab=knowledge-base')}
                    className="flex-shrink-0"
              >
                    <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                    <PageHeading>Knowledge Base Editor</PageHeading>
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


              {/* Tab-based Content Management */}
                <ThemeCard variant="glass">
                <div className="p-[var(--space-2xl)]">
                  {/* Tab Navigation */}
                  {getAvailableTabs().length > 0 && (
                    <div className="border-b border-border mb-[var(--space-2xl)]">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="h-auto p-0 bg-transparent justify-start inline-flex">
                            {getAvailableTabs().map((tab) => (
                              <button 
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as "documents" | "websites" | "text")}
                                className={`
                                  group relative flex items-center space-x-2 px-[var(--space-lg)] py-3 rounded-none border-b-2 transition-colors whitespace-nowrap
                                  ${activeTab === tab.key 
                                    ? 'border-primary bg-transparent text-foreground' 
                                    : 'border-transparent hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                                  }
                                `}
                              >
                                {tab.icon}
                                <span className="truncate">{tab.label}</span>
                                <Badge variant="outline" className="text-xs ml-2">
                                  {getDocumentsByType(tab.key as "documents" | "websites" | "text").length}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="pl-[var(--space-lg)] py-2">
                      <Button 
                            variant="ghost"
                            size="sm"
                        onClick={() => setIsAddContentOpen(true)}
                            className="h-10 px-3"
                      >
                            <Plus className="h-4 w-4 mr-2" />
                        Add Content
                      </Button>
                    </div>
                  </div>
                    </div>
                  )}

                  {/* Empty State - No Content */}
                  {getAvailableTabs().length === 0 && (
                    <div className="text-center py-[var(--space-3xl)]">
                    <div className="space-y-[var(--space-lg)]">
                        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Database className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-foreground">No content yet</h3>
                          <p className="text-muted-foreground mt-2">
                            Add your first piece of content to get started
                          </p>
                        </div>
                        <Button 
                          onClick={() => setIsAddContentOpen(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Content
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tab Content */}
                  {getAvailableTabs().length > 0 && (
                    <div className="space-y-6">
                    {/* Documents Tab */}
                    {activeTab === "documents" && (
                      <div className="space-y-6">
                        {getDocumentsByType("documents").length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <SubHeading className="mb-2">No documents yet</SubHeading>
                            <SecondaryText>
                              Upload files to add them to your knowledge base
                            </SecondaryText>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {getDocumentsByType("documents").map((doc) => (
                              <ThemeCard variant="glass" className="p-6" key={doc.doc_id}>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-5 w-5 text-primary" />
                                      <SubHeading>{doc.content_name || doc.original_filename}</SubHeading>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteDocument(doc.doc_id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Content
                                    </Button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Name Field */}
                                    <div>
                                      <Label htmlFor={`doc-name-${doc.doc_id}`} className="text-sm font-medium text-foreground">
                                        Name
                                      </Label>
                                      <Input
                                        id={`doc-name-${doc.doc_id}`}
                                        value={doc.content_name || doc.original_filename}
                                        readOnly
                                        className="mt-1 bg-muted/50"
                                      />
                                    </div>
                                    
                                    {/* File Field */}
                                    <div>
                                      <Label htmlFor={`doc-file-${doc.doc_id}`} className="text-sm font-medium text-foreground">
                                        File
                                      </Label>
                                      <Input
                                        id={`doc-file-${doc.doc_id}`}
                                        value={doc.original_filename}
                                        readOnly
                                        className="mt-1 bg-muted/50"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Description Field */}
                                  <div>
                                    <Label htmlFor={`doc-description-${doc.doc_id}`} className="text-sm font-medium text-foreground">
                                      Description
                                    </Label>
                                    <Textarea
                                      id={`doc-description-${doc.doc_id}`}
                                      value={doc.content_description || ""}
                                      readOnly
                                      className="min-h-[80px] mt-1 bg-muted/50"
                                    />
                                  </div>
                                  
                                  {/* File Details */}
                                  <div className="pt-4 border-t border-border">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                      <div>
                                        {formatFileSize(doc.file_size)} • {doc.original_filename.split('.').pop() || 'unknown'}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge className={getStatusColor(doc.pinecone_status || 'uploaded')}>
                                          {doc.pinecone_status || 'uploaded'}
                                        </Badge>
                                        <span>Uploaded {new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </ThemeCard>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Websites Tab */}
                    {activeTab === "websites" && (
                      <div className="space-y-6">
                        {/* Add Website Form */}
                        <ThemeCard variant="glass" className="p-6">
                          <div className="space-y-4">
                            <SubHeading>Add Website</SubHeading>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="website-name">Name</Label>
                                <Input
                                  id="website-name"
                                  placeholder="Website name..."
                                  value={editingContent.name}
                                  onChange={(e) => setEditingContent(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="website-url">URL</Label>
                                <Input
                                  id="website-url"
                                  placeholder="https://example.com"
                                  value={editingContent.url || ""}
                                  onChange={(e) => setEditingContent(prev => ({ ...prev, url: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="website-description">Description</Label>
                              <Textarea
                                id="website-description"
                                placeholder="Describe this website..."
                                value={editingContent.description}
                                onChange={(e) => setEditingContent(prev => ({ ...prev, description: e.target.value }))}
                                className="min-h-[80px]"
                              />
                            </div>
                            <Button 
                              onClick={handleSaveWebsite}
                              disabled={!editingContent.name.trim() || !editingContent.url?.trim()}
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Add Website
                            </Button>
                          </div>
                        </ThemeCard>

                        {/* Websites List */}
                        {getDocumentsByType("websites").length === 0 ? (
                          <div className="text-center py-12">
                            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <SubHeading className="mb-2">No websites yet</SubHeading>
                            <SecondaryText>
                              Add website URLs to include web content in your knowledge base
                            </SecondaryText>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {getDocumentsByType("websites").map((doc) => (
                          <div
                            key={doc.doc_id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center space-x-4">
                                  <Globe className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {doc.content_name || doc.original_filename}
                                </div>
                                {doc.content_description && (
                                  <div className="text-sm text-muted-foreground mb-1">
                                    {doc.content_description}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                      {doc.content_url}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Added {new Date(doc.upload_timestamp).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(doc.pinecone_status || 'ready')}>
                                    {doc.pinecone_status || 'ready'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteDocument(doc.doc_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Tab */}
                    {activeTab === "text" && (
                      <div className="space-y-6">
                        {/* Add Text Form */}
                        <ThemeCard variant="glass" className="p-6">
                          <div className="space-y-4">
                            <SubHeading>Add Text Content</SubHeading>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="text-name">Name</Label>
                                <Input
                                  id="text-name"
                                  placeholder="Content name..."
                                  value={editingContent.name}
                                  onChange={(e) => setEditingContent(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="text-description">Description</Label>
                                <Input
                                  id="text-description"
                                  placeholder="Brief description..."
                                  value={editingContent.description}
                                  onChange={(e) => setEditingContent(prev => ({ ...prev, description: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="text-content">Content</Label>
                              <Textarea
                                id="text-content"
                                placeholder="Enter your text content here..."
                                value={editingContent.text || ""}
                                onChange={(e) => setEditingContent(prev => ({ ...prev, text: e.target.value }))}
                                className="min-h-[120px]"
                              />
                            </div>
                            <Button 
                              onClick={handleSaveText}
                              disabled={!editingContent.name.trim() || !editingContent.text?.trim()}
                            >
                              <Type className="h-4 w-4 mr-2" />
                              Add Text Content
                            </Button>
                          </div>
                        </ThemeCard>

                        {/* Text Content List */}
                        {getDocumentsByType("text").length === 0 ? (
                          <div className="text-center py-12">
                            <Type className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <SubHeading className="mb-2">No text content yet</SubHeading>
                            <SecondaryText>
                              Add text content directly to your knowledge base
                            </SecondaryText>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {getDocumentsByType("text").map((doc) => (
                              <div
                                key={doc.doc_id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                              >
                                <div className="flex items-center space-x-4">
                                  <Type className="h-8 w-8 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {doc.content_name || doc.original_filename}
                                    </div>
                                    {doc.content_description && (
                                      <div className="text-sm text-muted-foreground mb-1">
                                        {doc.content_description}
                                      </div>
                                    )}
                                    <div className="text-sm text-muted-foreground">
                                      {formatFileSize(doc.file_size)} characters
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Added {new Date(doc.upload_timestamp).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(doc.pinecone_status || 'ready')}>
                                    {doc.pinecone_status || 'ready'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDocument(doc.doc_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                        )}
                      </div>
                    )}
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