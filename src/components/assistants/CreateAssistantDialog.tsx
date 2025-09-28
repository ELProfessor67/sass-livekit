import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAssistant?: (name: string, description: string) => void;
}

export function CreateAssistantDialog({ open, onOpenChange, onCreateAssistant }: CreateAssistantDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNameValid = name.trim().length > 0 && name.length <= 40;
  const isNameOverLimit = name.length > 40;
  const nameRemainingChars = 40 - name.length;
  const isNameNearLimit = nameRemainingChars <= 5;
  const isNameAtLimit = nameRemainingChars <= 0;

  const isDescriptionValid = description.length <= 180;
  const isDescriptionOverLimit = description.length > 180;
  const descriptionRemainingChars = 180 - description.length;
  const isDescriptionNearLimit = descriptionRemainingChars <= 20;
  const isDescriptionAtLimit = descriptionRemainingChars <= 0;

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const input = document.querySelector('#assistant-name-input') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!isNameValid || !isDescriptionValid || isCreating) return;

    setIsCreating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Assistant Created",
        description: `"${name}" has been created successfully.`,
      });
      
      // Call callback if provided
      if (onCreateAssistant) {
        onCreateAssistant(name, description);
      }
      
      // Navigate to assistant creation page with the name and description
      const params = new URLSearchParams();
      params.set('name', name);
      if (description.trim()) {
        params.set('description', description);
      }
      navigate(`/assistants/create?${params.toString()}`);
      
      // Reset form and close modal
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle enter key submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isNameValid && isDescriptionValid && !isCreating) {
      handleSubmit();
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsCreating(false);
    }
  }, [open]);

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      
      <ThemedDialogContent className="sm:max-w-xl">
        <ThemedDialogHeader
          title="Create New Assistant"
          description="Give your AI assistant a name and description to get started. You'll be able to configure its personality and capabilities next."
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input Container */}
          <div className="relative overflow-hidden px-1">
            {/* Decorative gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative group">
              <input
                id="assistant-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your assistant's name..."
                maxLength={50} // Allow typing beyond 40 for validation feedback
                className={cn(
                  "h-14 w-full px-5 pr-16 text-lg rounded-2xl backdrop-blur-xl bg-card/50",
                  "border border-border/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary/40",
                  "focus-visible:bg-card/70 focus-visible:backdrop-blur-2xl",
                  "hover:border-border/70 hover:bg-card/60",
                  isNameOverLimit && "border-destructive/60 focus-visible:border-destructive/80",
                  isNameNearLimit && !isNameOverLimit && "border-amber-400/60 focus-visible:border-amber-400/80"
                )}
              />
              
              {/* Character Counter */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
                <span
                  className={cn(
                    "transition-all duration-200",
                    !isNameNearLimit && "text-muted-foreground",
                    isNameNearLimit && !isNameOverLimit && "text-amber-500",
                    isNameAtLimit && !isNameOverLimit && "text-primary",
                    isNameOverLimit && "text-destructive animate-pulse"
                  )}
                >
                  {name.length}/40
                </span>
              </div>

              {/* Group hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
            </div>
          </div>

          {/* Description Input Container */}
          <div className="relative overflow-hidden px-1">
            <div className="relative group">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this assistant will help with... (optional)"
                maxLength={200} // Allow typing beyond 180 for validation feedback
                className={cn(
                  "min-h-[100px] resize-none backdrop-blur-xl bg-card/50 pr-16",
                  "border border-border/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary/40",
                  "focus-visible:bg-card/70 focus-visible:backdrop-blur-2xl",
                  "hover:border-border/70 hover:bg-card/60",
                  isDescriptionOverLimit && "border-destructive/60 focus-visible:border-destructive/80",
                  isDescriptionNearLimit && !isDescriptionOverLimit && "border-amber-400/60 focus-visible:border-amber-400/80"
                )}
              />
              
              {/* Character Counter */}
              <div className="absolute right-3 bottom-3 text-xs font-medium pointer-events-none">
                <span
                  className={cn(
                    "transition-all duration-200",
                    !isDescriptionNearLimit && "text-muted-foreground",
                    isDescriptionNearLimit && !isDescriptionOverLimit && "text-amber-500",
                    isDescriptionAtLimit && !isDescriptionOverLimit && "text-primary",
                    isDescriptionOverLimit && "text-destructive animate-pulse"
                  )}
                >
                  {description.length}/180
                </span>
              </div>

              {/* Group hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
            </div>
          </div>

          {/* Preview Text */}
          {(name.trim() || description.trim()) && (
            <div className="pl-1 animate-fade-in space-y-1">
              {isNameOverLimit ? (
                <p className="text-sm text-destructive animate-pulse">
                  Name too long - please keep it under 40 characters
                </p>
              ) : isDescriptionOverLimit ? (
                <p className="text-sm text-destructive animate-pulse">
                  Description too long - please keep it under 180 characters
                </p>
              ) : name.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Your AI companion will be known as "{name}"
                  {description.trim() && (
                    <span className="block mt-1 text-xs opacity-80">
                      {description}
                    </span>
                  )}
                </p>
              ) : null}
            </div>
          )}

          {/* Button Row */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="h-11 min-w-[120px]"
              disabled={!isNameValid || !isDescriptionValid || isCreating || isNameOverLimit || isDescriptionOverLimit}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Assistant"
              )}
            </Button>
          </div>
        </form>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}