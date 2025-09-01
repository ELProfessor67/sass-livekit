import React, { useCallback, useState } from 'react';
import { Upload, File, X, FileText, Image, FileVideo, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileMetadata } from '../types/knowledgeBase';

interface FileUploadAreaProps {
  files: FileMetadata[];
  onFilesAdd: (files: FileMetadata[]) => void;
  onFileDelete: (fileId: string) => void;
  onFilePreview: (file: FileMetadata) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json'
];

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes('word') || type.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />;
  if (type.includes('text') || type.includes('csv')) return <File className="h-4 w-4 text-green-500" />;
  if (type.includes('image')) return <Image className="h-4 w-4 text-purple-500" />;
  if (type.includes('video')) return <FileVideo className="h-4 w-4 text-pink-500" />;
  if (type.includes('audio')) return <FileAudio className="h-4 w-4 text-orange-500" />;
  return <File className="h-4 w-4 text-theme-secondary" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  files,
  onFilesAdd,
  onFileDelete,
  onFilePreview,
  isUploading = false,
  uploadProgress = 0
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => 
      ACCEPTED_FILE_TYPES.includes(file.type) || file.name.endsWith('.txt')
    );

    const newFiles: FileMetadata[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      uploadedAt: new Date().toISOString(),
      content: '' // Will be populated when file is read
    }));

    onFilesAdd(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Compact Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200
          ${dragActive 
            ? 'border-primary/60 bg-primary/5' 
            : 'border-theme-medium hover:border-theme-strong'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-theme-muted/30'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.json"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <Upload className="h-8 w-8 mx-auto mb-3 text-theme-secondary" />
        <p className="text-sm font-medium text-theme-primary mb-1">
          {dragActive ? 'Drop files here' : 'Click to upload or drag files here'}
        </p>
        <p className="text-xs text-theme-tertiary">
          PDF, DOC, DOCX, TXT, CSV, JSON
        </p>
        
        {isUploading && (
          <div className="mt-3">
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            <p className="text-xs text-theme-secondary mt-1">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* Compact File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-theme-primary">
            Files ({files.length})
          </h4>
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center justify-between p-2 surface-elevated border-theme-light rounded-lg hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-primary truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-theme-secondary">
                      {formatFileSize(file.size)}
                    </p>
                    
                    {/* Hover details */}
                    <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="text-xs text-muted-foreground space-y-1 whitespace-nowrap">
                        <div>Type: {file.type}</div>
                        <div>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilePreview(file)}
                    className="h-8 px-2 text-theme-secondary hover:text-theme-primary"
                  >
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDelete(file.id)}
                    className="h-8 px-2 text-destructive hover:text-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};