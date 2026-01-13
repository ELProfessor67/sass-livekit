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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import React from "react";

interface CreateWorkflowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, description: string, category: string) => void;
}

export function CreateWorkflowDialog({
    open,
    onOpenChange,
    onCreate
}: CreateWorkflowDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("unsorted");

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name, description, category);
            // Reset form
            setName("");
            setDescription("");
            setCategory("unsorted");
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
                            className="bg-muted/30 border-border/50 focus:border-primary/50"
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
                            className="bg-muted/30 border-border/50 focus:border-primary/50 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="create-workflow-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Initial Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="create-workflow-category" className="bg-muted/30 border-border/50">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unsorted">Unsorted / General</SelectItem>
                                <SelectItem value="proactive">Proactive Outbound</SelectItem>
                                <SelectItem value="reception">Inbound Reception</SelectItem>
                                <SelectItem value="support">Customer Support</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Create Workflow
                    </Button>
                </DialogFooter>
            </ThemedDialogContent>
        </ThemedDialog>
    );
}
