import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Link, Type, Download, ExternalLink, Upload } from 'lucide-react';
import { SubKnowledgeBase, FileMetadata } from '../types/knowledgeBase';

interface ContentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: SubKnowledgeBase | FileMetadata | null;
  type: 'sub-kb' | 'file';
}

const getContentIcon = (type: string) => {
  if (type === 'website') return <Link className="h-5 w-5" />;
  if (type === 'text') return <Type className="h-5 w-5" />;
  if (type === 'document') return <Upload className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
};

export const ContentPreviewDialog: React.FC<ContentPreviewDialogProps> = ({
  open,
  onOpenChange,
  content,
  type
}) => {
  if (!content) return null;

  const renderSubKBContent = (subKB: SubKnowledgeBase) => {
    return (
      <>
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            {getContentIcon(subKB.type)}
            <div className="flex-1">
              <DialogTitle className="text-left">{subKB.name}</DialogTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">{subKB.type}</Badge>
                <Badge 
                  variant={subKB.status === 'ready' ? 'default' : 
                          subKB.status === 'processing' ? 'secondary' : 'destructive'}
                >
                  {subKB.status}
                </Badge>
              </div>
            </div>
          </div>
          {subKB.description && (
            <p className="text-theme-secondary text-left">{subKB.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Content */}
          {subKB.type === 'website' && subKB.url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-theme-primary">Source URL</h4>
                <Button variant="ghost" size="sm" asChild>
                  <a href={subKB.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit
                  </a>
                </Button>
              </div>
              <div className="p-3 surface-elevated border-theme-light rounded-lg">
                <p className="text-sm text-theme-secondary break-all">{subKB.url}</p>
              </div>
            </div>
          )}

          {/* Scraped Content */}
          {subKB.scrapedContent && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-theme-primary">Scraped Content</h4>
              <ScrollArea className="h-64 p-4 surface-elevated border-theme-light rounded-lg">
                <pre className="text-sm text-theme-secondary whitespace-pre-wrap font-mono">
                  {subKB.scrapedContent}
                </pre>
              </ScrollArea>
            </div>
          )}

          {/* Text Content */}
          {subKB.type === 'text' && subKB.content && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-theme-primary">Text Content</h4>
              <ScrollArea className="h-64 p-4 surface-elevated border-theme-light rounded-lg">
                <p className="text-sm text-theme-secondary whitespace-pre-wrap">
                  {subKB.content}
                </p>
              </ScrollArea>
            </div>
          )}

          {/* Document Content */}
          {subKB.type === 'document' && subKB.files && subKB.files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-theme-primary">
                Uploaded Documents ({subKB.files.length})
              </h4>
              <div className="space-y-2">
                {subKB.files.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center justify-between p-3 surface-elevated border-theme-light rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-theme-secondary" />
                      <div>
                        <p className="text-sm font-medium text-theme-primary">{file.name}</p>
                        <p className="text-xs text-theme-secondary">
                          {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {subKB.files && subKB.files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-theme-primary">
                Files ({subKB.files.length})
              </h4>
              <div className="space-y-2">
                {subKB.files.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center justify-between p-3 surface-elevated border-theme-light rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-theme-secondary" />
                      <div>
                        <p className="text-sm font-medium text-theme-primary">{file.name}</p>
                        <p className="text-xs text-theme-secondary">
                          {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderFileContent = (file: FileMetadata) => {
    return (
      <>
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5" />
            <div className="flex-1">
              <DialogTitle className="text-left">{file.name}</DialogTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">{file.type.split('/')[1]?.toUpperCase()}</Badge>
                <span className="text-xs text-theme-secondary">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-theme-primary">File Details</h4>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 surface-elevated border-theme-light rounded-lg">
              <div>
                <p className="text-xs text-theme-secondary">Size</p>
                <p className="text-sm font-medium text-theme-primary">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-secondary">Type</p>
                <p className="text-sm font-medium text-theme-primary">{file.type}</p>
              </div>
              <div>
                <p className="text-xs text-theme-secondary">Uploaded</p>
                <p className="text-sm font-medium text-theme-primary">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-secondary">ID</p>
                <p className="text-sm font-mono text-theme-primary">{file.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {file.content && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-theme-primary">Content Preview</h4>
              <ScrollArea className="h-64 p-4 surface-elevated border-theme-light rounded-lg">
                <pre className="text-sm text-theme-secondary whitespace-pre-wrap font-mono">
                  {file.content}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        {type === 'sub-kb' && renderSubKBContent(content as SubKnowledgeBase)}
        {type === 'file' && renderFileContent(content as FileMetadata)}
      </DialogContent>
    </Dialog>
  );
};