import React, { useState } from "react";
import { FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubKnowledgeBase } from "../types/knowledgeBase";

interface CreateSubKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSubKnowledgeBase: (subKnowledgeBase: Omit<SubKnowledgeBase, "id" | "createdAt" | "status">) => void;
}

export function CreateSubKnowledgeBaseDialog({
  open,
  onOpenChange,
  onCreateSubKnowledgeBase,
}: CreateSubKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"document" | "website" | "text">("website");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === "website" && !url.trim()) return;
    if (type === "text" && !content.trim()) return;

    onCreateSubKnowledgeBase({
      name: name.trim(),
      description: description.trim(),
      type,
      url: type === "website" ? url.trim() : undefined,
      content: type === "text" ? content.trim() : undefined,
    });

    // Reset form
    setName("");
    setDescription("");
    setUrl("");
    setContent("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setUrl("");
    setContent("");
    onOpenChange(false);
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (type === "website" && !url.trim()) return false;
    if (type === "text" && !content.trim()) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/95 border-border/50">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold">Add Sub-Knowledge Base</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add content to your knowledge base from websites or text sources.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-kb-name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="sub-kb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Company Website"
                className="w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sub-kb-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="sub-kb-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this content source..."
                rows={2}
                className="w-full resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Content Type</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant={type === "website" ? "default" : "outline"}
                  onClick={() => setType("website")}
                  className="flex-1"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Website
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={type === "text" ? "default" : "outline"}
                  onClick={() => setType("text")}
                  className="flex-1"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Text
                </Button>
              </div>
            </div>
            
            {type === "website" && (
              <div className="space-y-2">
                <Label htmlFor="sub-kb-url" className="text-sm font-medium">
                  Website URL
                </Label>
                <Input
                  id="sub-kb-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The website content will be scraped and added to your knowledge base.
                </p>
              </div>
            )}

            {type === "text" && (
              <div className="space-y-2">
                <Label htmlFor="sub-kb-content" className="text-sm font-medium">
                  Text Content
                </Label>
                <Textarea
                  id="sub-kb-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your text content here..."
                  rows={4}
                  className="w-full resize-none"
                  required
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid()}>
              Add Content
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}