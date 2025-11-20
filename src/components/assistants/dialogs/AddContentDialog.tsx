import React, { useState } from "react";
import { Upload } from "lucide-react";
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
    files: File[];
    type?: "document" | "website" | "text";
  }) => void;
}

export function AddContentDialog({
  open,
  onOpenChange,
  onAddContent,
}: AddContentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (files.length === 0) return;

    setLoading(true);
    
    try {
      await onAddContent({
        name: name.trim(),
        description: description.trim(),
        files,
        type: "document",
      });

      // Reset form
      setName("");
      setDescription("");
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
    setFiles([]);
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (files.length === 0) return false;
    return true;
  };

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ThemedDialogHeader
            title="Add Content"
            description="Upload files to add new knowledge sources for your assistants."
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
                placeholder="e.g., Product FAQ"
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
