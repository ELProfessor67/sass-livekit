import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/layout/DashboardLayout";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ArrowLeft,
  Plus,
  Download
} from "lucide-react";
import { 
  getKnowledgeBase, 
  updateKnowledgeBase, 
  deleteKnowledgeBase, 
  uploadDocument, 
  deleteDocument,
  getEnhancedContextSnippets,
  searchMultipleQueries,
  getFilteredContextSnippets,
  type EnhancedContextSnippetsResponse,
  type MultiSearchContextSnippetsResponse,
  type FilteredContextSnippetsResponse,
  type ContextSnippetsFilters
} from "@/lib/api/knowledgeBase";
import { KnowledgeBase, Document } from "@/components/assistants/types/knowledgeBase";

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
  
  // Context snippets state
  const [contextQuery, setContextQuery] = useState("");
  const [contextSnippets, setContextSnippets] = useState<EnhancedContextSnippetsResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [showContextSnippets, setShowContextSnippets] = useState(false);
  const [contextOptions, setContextOptions] = useState({
    top_k: 16,
    snippet_size: 2048
  });
  const [contextFilters, setContextFilters] = useState<ContextSnippetsFilters>({});

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
            original_filename: doc.original_filename,
            file_size: doc.file_size,
            file_type: doc.original_filename.split('.').pop() || 'unknown',
            status: doc.status,
            upload_timestamp: doc.upload_timestamp,
            created_at: doc.created_at
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
          original_filename: uploadResponse.document.filename,
          file_size: uploadResponse.document.file_size,
          file_type: uploadResponse.document.filename.split('.').pop() || 'unknown',
          status: uploadResponse.document.status,
          upload_timestamp: uploadResponse.document.upload_timestamp,
          created_at: uploadResponse.document.upload_timestamp
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

      navigate('/knowledge-base');
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

  // Context snippets functions
  const handleContextSearch = async () => {
    if (!contextQuery.trim() || !knowledgeBase) return;

    try {
      setLoadingContext(true);
      setContextError(null);
      
      const result = await getEnhancedContextSnippets(
        knowledgeBase.id,
        contextQuery.trim(),
        contextOptions
      );
      
      if (result.success) {
        setContextSnippets(result);
        setShowContextSnippets(true);
        
        toast({
          title: "Context snippets found",
          description: `Found ${result.total_snippets} relevant snippets from your knowledge base.`,
        });
      } else {
        setContextError(result.error || 'Failed to retrieve context snippets');
      }
    } catch (error) {
      console.error('Context search error:', error);
      setContextError(error instanceof Error ? error.message : 'Failed to search context');
      
      toast({
        title: "Search failed",
        description: "Failed to retrieve context snippets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingContext(false);
    }
  };

  const handleFilteredContextSearch = async () => {
    if (!contextQuery.trim() || !knowledgeBase) return;

    try {
      setLoadingContext(true);
      setContextError(null);
      
      const result = await getFilteredContextSnippets(
        knowledgeBase.id,
        contextQuery.trim(),
        contextFilters,
        contextOptions
      );
      
      if (result.success) {
        setContextSnippets(result);
        setShowContextSnippets(true);
        
        toast({
          title: "Filtered context snippets found",
          description: `Found ${result.total_snippets} relevant snippets (filtered from ${result.original_count}).`,
        });
      } else {
        setContextError(result.error || 'Failed to retrieve filtered context snippets');
      }
    } catch (error) {
      console.error('Filtered context search error:', error);
      setContextError(error instanceof Error ? error.message : 'Failed to search filtered context');
      
      toast({
        title: "Search failed",
        description: "Failed to retrieve filtered context snippets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingContext(false);
    }
  };

  const clearContextSearch = () => {
    setContextQuery("");
    setContextSnippets(null);
    setContextError(null);
    setShowContextSnippets(false);
  };

  // Show loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading knowledge base...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => navigate('/knowledge-base')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Bases
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!knowledgeBase) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/knowledge-base')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Knowledge Base Editor</h1>
                <p className="text-muted-foreground">Manage your knowledge base content</p>
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

          {/* Knowledge Base Info */}
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter knowledge base name"
                    />
                    <Button size="sm" onClick={handleSaveName}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditingName("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium">{knowledgeBase.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingName(knowledgeBase.name);
                        setIsEditingName(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder="Enter knowledge base description"
                      rows={3}
                    />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={handleSaveDescription}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setIsEditingDescription(false);
                          setEditingDescription("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">
                      {knowledgeBase.description || "No description"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingDescription(knowledgeBase.description);
                        setIsEditingDescription(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold">{knowledgeBase.documents.length}</div>
                  <div className="text-sm text-muted-foreground">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatFileSize(knowledgeBase.documents.reduce((sum, doc) => sum + doc.file_size, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {knowledgeBase.documents.filter(doc => doc.pinecone_status === 'ready').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="file-upload">
                    <Button asChild disabled={uploading}>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload Documents"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {knowledgeBase.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload documents to build your knowledge base
                  </p>
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Your First Document
                      </span>
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {knowledgeBase.documents.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.original_filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(doc.file_size)} • {doc.original_filename.split('.').pop() || 'unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Uploaded {new Date(doc.upload_timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(doc.pinecone_status || 'uploaded')}>
                          {doc.pinecone_status || 'uploaded'}
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
            </CardContent>
          </Card>

          {/* Context Snippets Search */}
          <Card>
            <CardHeader>
              <CardTitle>Context Snippets Search</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search your knowledge base for relevant context snippets using Pinecone Assistant
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter your search query..."
                  value={contextQuery}
                  onChange={(e) => setContextQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleContextSearch()}
                  disabled={loadingContext}
                />
                <Button 
                  onClick={handleContextSearch} 
                  disabled={loadingContext || !contextQuery.trim()}
                >
                  {loadingContext ? "Searching..." : "Search"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearContextSearch}
                  disabled={loadingContext}
                >
                  Clear
                </Button>
              </div>

              {/* Search Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Results (top_k)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={contextOptions.top_k}
                    onChange={(e) => setContextOptions(prev => ({ 
                      ...prev, 
                      top_k: parseInt(e.target.value) || 16 
                    }))}
                    disabled={loadingContext}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Snippet Size (tokens)</label>
                  <Input
                    type="number"
                    min="100"
                    max="5000"
                    value={contextOptions.snippet_size}
                    onChange={(e) => setContextOptions(prev => ({ 
                      ...prev, 
                      snippet_size: parseInt(e.target.value) || 2048 
                    }))}
                    disabled={loadingContext}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filters (Optional)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">File Types (comma-separated)</label>
                    <Input
                      placeholder="pdf, docx, txt"
                      value={contextFilters.file_types?.join(', ') || ''}
                      onChange={(e) => setContextFilters(prev => ({ 
                        ...prev, 
                        file_types: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined
                      }))}
                      disabled={loadingContext}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Min Relevance Score</label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      placeholder="0.5"
                      value={contextFilters.min_relevance_score || ''}
                      onChange={(e) => setContextFilters(prev => ({ 
                        ...prev, 
                        min_relevance_score: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      disabled={loadingContext}
                    />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleFilteredContextSearch}
                  disabled={loadingContext || !contextQuery.trim()}
                >
                  Search with Filters
                </Button>
              </div>

              {/* Error Display */}
              {contextError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{contextError}</p>
                </div>
              )}

              {/* Results */}
              {showContextSnippets && contextSnippets && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Search Results ({contextSnippets.total_snippets} snippets)
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      Avg Relevance: {(contextSnippets.average_relevance * 100).toFixed(1)}%
                    </div>
                  </div>

                  {contextSnippets.snippets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No context snippets found for your query.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contextSnippets.snippets.map((snippet, index) => (
                        <div key={snippet.id || index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {snippet.file_type.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {snippet.file_name}
                              </span>
                              {snippet.page_numbers.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Page {snippet.page_numbers.join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">
                                {(snippet.relevance_score * 100).toFixed(1)}% relevant
                              </Badge>
                              {snippet.signed_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a 
                                    href={snippet.signed_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    View File
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-2">
                              {snippet.content_preview}
                            </p>
                            <details className="group">
                              <summary className="cursor-pointer text-primary hover:underline">
                                View full content
                              </summary>
                              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                                {snippet.content}
                              </div>
                            </details>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}