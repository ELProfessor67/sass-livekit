import React, { useState } from "react";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { KnowledgeBase } from "../types/knowledgeBase";
import { cn } from "@/lib/utils";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateKnowledgeBase: (knowledgeBase: Omit<KnowledgeBase, "id" | "createdAt" | "subKnowledgeBases">) => Promise<string | void>;
}

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
  onCreateKnowledgeBase,
}: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      setLoading(true);
      
      // Create the knowledge base structure
      const knowledgeBase: Omit<KnowledgeBase, "id" | "createdAt" | "subKnowledgeBases"> = {
        name: name.trim(),
        description: description.trim(),
      };

      // Call the parent handler to create the knowledge base
      await onCreateKnowledgeBase(knowledgeBase);

      // Reset form and close dialog
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setDescription("");
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const isValid = name.trim();


  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent className="max-h-[90vh] overflow-y-auto">
        <ThemedDialogHeader 
          title="Create Knowledge Base"
          description="Add a new knowledge base to store documents and information"
        />

        {/* Form */}
        <div className="space-y-[var(--space-lg)] mt-[var(--space-lg)]">
          <div className="space-y-[var(--space-sm)]">
            <Label htmlFor="name" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your knowledge base"
              className="glass-input"
            />
          </div>

          <div className="space-y-[var(--space-sm)]">
            <Label htmlFor="description" className="text-[var(--text-sm)] font-[var(--font-medium)] text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and contents of this knowledge base"
              className="min-h-[120px] resize-none glass-input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-[var(--space-md)] mt-[var(--space-xl)]">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-[var(--space-lg)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="px-[var(--space-lg)]"
          >
            {loading ? "Creating..." : "Continue"}
          </Button>
        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}