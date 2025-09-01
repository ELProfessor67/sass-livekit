import React, { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateAssistantDialogProps {
  onCreateAssistant?: (name: string) => void;
}

export function CreateAssistantDialog({ onCreateAssistant }: CreateAssistantDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNameValid = name.trim().length > 0 && name.length <= 40;
  const isOverLimit = name.length > 40;
  const remainingChars = 40 - name.length;
  const isNearLimit = remainingChars <= 5;
  const isAtLimit = remainingChars <= 0;

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
    
    if (!isNameValid || isCreating) return;

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
        onCreateAssistant(name);
      }
      
      // Navigate to assistant creation page with the name
      navigate(`/assistants/create?name=${encodeURIComponent(name)}`);
      
      // Reset form and close modal
      setName("");
      setOpen(false);
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
    if (e.key === 'Enter' && isNameValid && !isCreating) {
      handleSubmit();
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setName("");
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="font-medium bg-primary hover:bg-primary/90 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Assistant
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-xl backdrop-blur-xl bg-card/90 border border-border/50">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-semibold tracking-tight mb-2 text-theme-primary">
            Create New Assistant
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-theme-secondary">
            Give your AI assistant a memorable name to get started. You'll be able to configure its personality and capabilities next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Main Input Container */}
          <div className="relative overflow-hidden px-1 pt-2">
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
                  isOverLimit && "border-destructive/60 focus-visible:border-destructive/80",
                  isNearLimit && !isOverLimit && "border-amber-400/60 focus-visible:border-amber-400/80"
                )}
              />
              
              {/* Character Counter */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
                <span
                  className={cn(
                    "transition-all duration-200",
                    !isNearLimit && "text-muted-foreground",
                    isNearLimit && !isOverLimit && "text-amber-500",
                    isAtLimit && !isOverLimit && "text-primary",
                    isOverLimit && "text-destructive animate-pulse"
                  )}
                >
                  {name.length}/40
                </span>
              </div>

              {/* Group hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
            </div>
          </div>

          {/* Preview Text */}
          {name.trim() && (
            <div className="pl-1 animate-fade-in">
              {isOverLimit ? (
                <p className="text-sm text-destructive animate-pulse">
                  Name too long - please keep it under 40 characters
                </p>
              ) : (
                <p className="text-sm text-neutral-500">
                  Your AI companion will be known as "{name}"
                </p>
              )}
            </div>
          )}

          {/* Button Row */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-11"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[120px]"
              disabled={!isNameValid || isCreating || isOverLimit}
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
      </DialogContent>
    </Dialog>
  );
}