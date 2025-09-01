import React, { useCallback, useState } from 'react';
import { Upload, File, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContactFileUploadProps {
  onFileSelect: (file: File | null) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  selectedFile?: File | null;
}

export const ContactFileUpload: React.FC<ContactFileUploadProps> = ({
  onFileSelect,
  acceptedTypes = ".csv,.xlsx,.xls",
  maxSize = 10,
  selectedFile
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    setError("");
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Check file type
    const allowedExtensions = acceptedTypes.split(',').map(ext => ext.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`File type not supported. Please use: ${acceptedTypes}`);
      return false;
    }

    return true;
  };

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
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect, maxSize, acceptedTypes]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect, maxSize, acceptedTypes]);

  const handleRemoveFile = () => {
    onFileSelect(null);
    setError("");
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${dragActive 
              ? 'border-primary/60 bg-primary/5' 
              : 'border-theme-medium hover:border-theme-strong'
            }
            cursor-pointer hover:bg-theme-muted/30
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('contact-file-upload')?.click()}
        >
          <input
            id="contact-file-upload"
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInput}
            className="hidden"
          />
          
          <Upload className="h-12 w-12 mx-auto mb-4 text-theme-secondary" />
          <p className="text-base font-medium text-theme-primary mb-2">
            {dragActive ? 'Drop your file here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-sm text-theme-tertiary mb-2">
            Supports CSV, XLSX, XLS files up to {maxSize}MB
          </p>
          <Button variant="outline" className="mt-4">
            Choose File
          </Button>
        </div>
      ) : (
        <div className="p-4 border border-theme-light rounded-lg bg-surface-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-theme-primary">{selectedFile.name}</p>
                <p className="text-sm text-theme-secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveFile}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};