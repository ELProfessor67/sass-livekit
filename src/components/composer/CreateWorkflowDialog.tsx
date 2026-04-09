import { useState } from "react";
import {
    ThemedDialog,
    ThemedDialogContent,
    ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import React from "react";

interface CreateWorkflowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, description: string) => void;
}

export function CreateWorkflowDialog({
    open,
    onOpenChange,
    onCreate
}: CreateWorkflowDialogProps) {
    const { uiStyle } = useTheme();
    const isGlass = uiStyle === "glass";
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name, description);
            // Reset form
            setName("");
            setDescription("");
            onOpenChange(false);
        }
    };

    return (
        <ThemedDialog open={open} onOpenChange={onOpenChange}>
            <ThemedDialogContent className="sm:max-w-[500px]">
                <ThemedDialogHeader
                    title="Create New Workflow"
                    description="Set up a new automated workflow to streamline your operations."
                />

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="create-workflow-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Workflow Name
                        </Label>
                        <Input
                            id="create-workflow-name"
                            placeholder="e.g., Guest Request Additional Supplies"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "border transition-colors",
                                isGlass
                                    ? "bg-white/10 border-white/20 focus:border-white/40 dark:bg-white/5 dark:border-white/10 dark:focus:border-white/25"
                                    : "bg-muted/30 border-border/50 focus:border-primary/50"
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="create-workflow-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Description (Optional)
                        </Label>
                        <Textarea
                            id="create-workflow-description"
                            placeholder="Describe what this workflow does..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={cn(
                                "border resize-none transition-colors",
                                isGlass
                                    ? "bg-white/10 border-white/20 focus:border-white/40 dark:bg-white/5 dark:border-white/10 dark:focus:border-white/25"
                                    : "bg-muted/30 border-border/50 focus:border-primary/50"
                            )}
                        />
                    </div>

                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                    >
                        Create Workflow
                    </Button>
                </DialogFooter>
            </ThemedDialogContent>
        </ThemedDialog>
    );
}
