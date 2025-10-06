import React, { useState } from "react";
import { FileText, Globe, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { DialogFooter } from "@/components/ui/dialog";

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContent: (content: {
    name: string;
    description: string;
    type: "document" | "website" | "text";
    url?: string;
    content?: string;
    files?: File[];
  }) => void;
}

export function AddContentDialog({
  open,
  onOpenChange,
  onAddContent,
}: AddContentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"document" | "website" | "text">("document");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === "website" && !url.trim()) return;
    if (type === "text" && !content.trim()) return;
    if (type === "document" && files.length === 0) return;

    setLoading(true);
    
    try {
      await onAddContent({
        name: name.trim(),
        description: description.trim(),
        type,
        url: type === "website" ? url.trim() : undefined,
        content: type === "text" ? content.trim() : undefined,
        files: type === "document" ? files : undefined,
      });

      // Reset form
      setName("");
      setDescription("");
      setUrl("");
      setContent("");
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setUrl("");
    setContent("");
    setFiles([]);
    onOpenChange(false);
  };

  const handleTypeChange = (newType: "document" | "website" | "text") => {
    setType(newType);
    // Clear type-specific data when switching
    if (newType !== "document") {
      setFiles([]);
    }
    if (newType !== "website") {
      setUrl("");
    }
    if (newType !== "text") {
      setContent("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (type === "website" && !url.trim()) return false;
    if (type === "text" && !content.trim()) return false;
    if (type === "document" && files.length === 0) return false;
    return true;
  };

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ThemedDialogHeader
            title="Add Content"
            description="Add content to your knowledge base from files, websites, or text sources."
          />
          
          <div className="space-y-[var(--space-lg)] mt-[var(--space-lg)]">
            <div className="space-y-[var(--space-sm)]">
              <Label htmlFor="content-name" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="content-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Company Website"
                className="glass-input"
                required
              />
            </div>
            
            <div className="space-y-[var(--space-sm)]">
              <Label htmlFor="content-description" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
                Description
              </Label>
              <Textarea
                id="content-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this content source..."
                rows={2}
                className="glass-input resize-none"
              />
            </div>

            <div className="space-y-[var(--space-sm)]">
              <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">Content Type</Label>
              <div className="grid grid-cols-3 gap-[var(--space-sm)]">
                <Button
                  type="button"
                  size="sm"
                  variant={type === "document" ? "default" : "outline"}
                  onClick={() => handleTypeChange("document")}
                  className="flex flex-col h-auto p-3"
                >
                  <Upload className="h-4 w-4 mb-1" />
                  <span className="text-xs">File</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={type === "website" ? "default" : "outline"}
                  onClick={() => handleTypeChange("website")}
                  className="flex flex-col h-auto p-3"
                >
                  <Globe className="h-4 w-4 mb-1" />
                  <span className="text-xs">Website</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={type === "text" ? "default" : "outline"}
                  onClick={() => handleTypeChange("text")}
                  className="flex flex-col h-auto p-3"
                >
                  <FileText className="h-4 w-4 mb-1" />
                  <span className="text-xs">Text</span>
                </Button>
              </div>
            </div>

            {type === "document" && (
              <div className="space-y-[var(--space-sm)]">
                <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
                  Upload Files
                </Label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                <p className="text-xs text-muted-foreground">
                  Upload documents, PDFs, text files, or other content files to add to your knowledge base.
                </p>
              </div>
            )}
            
            {type === "website" && (
              <div className="space-y-[var(--space-sm)]">
                <Label htmlFor="content-url" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
                  Website URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="content-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="glass-input"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The website content will be scraped and added to your knowledge base.
                </p>
              </div>
            )}

            {type === "text" && (
              <div className="space-y-[var(--space-sm)]">
                <Label htmlFor="content-text" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
                  Text Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="content-text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your text content here..."
                  rows={4}
                  className="glass-input resize-none"
                  required
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-[var(--space-md)] mt-[var(--space-xl)]">
            <Button type="button" variant="outline" onClick={handleCancel} className="px-[var(--space-lg)]">
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid() || loading} className="px-[var(--space-lg)]">
              {loading ? "Adding..." : "Add Content"}
            </Button>
          </DialogFooter>
        </form>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}
