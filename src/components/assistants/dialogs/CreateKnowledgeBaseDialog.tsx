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
import { Database, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { KnowledgeBase } from "../types/knowledgeBase";

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
  const { toast } = useToast();

  const handleCreateKnowledgeBase = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a knowledge base name.",
        variant: "destructive",
      });
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

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new knowledge base to organize your content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Knowledge Base Name</Label>
            <Input
              id="name"
              placeholder="e.g., Product Documentation, Customer Support"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this knowledge base will contain..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateKnowledgeBase} 
            disabled={!name.trim() || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            <Plus className="h-4 w-4 mr-2" />
            Create Knowledge Base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}