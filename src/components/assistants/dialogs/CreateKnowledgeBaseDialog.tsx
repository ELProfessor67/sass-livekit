import React, { useState } from "react";
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
import { KnowledgeBase } from "../types/knowledgeBase";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateKnowledgeBase: (knowledgeBase: Omit<KnowledgeBase, "id" | "createdAt" | "subKnowledgeBases">) => void;
}

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
  onCreateKnowledgeBase,
}: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateKnowledgeBase({
      name: name.trim(),
      description: description.trim(),
    });

    // Reset form
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/95 border-border/50">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold">Create Knowledge Base</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new knowledge base to organize your information and documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kb-name" className="text-sm font-medium">
                Knowledge Base Name
              </Label>
              <Input
                id="kb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Documentation"
                className="w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kb-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="kb-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this knowledge base contains..."
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}