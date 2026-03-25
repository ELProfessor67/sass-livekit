import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemedDialog, ThemedDialogContent, ThemedDialogHeader } from "@/components/ui/themed-dialog";
import { UploadSimple } from "phosphor-react";
import { Workspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditWorkspaceDialogProps {
    workspace: Workspace;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updates: Partial<Workspace>) => void;
    onDelete?: () => void;
}

export function EditWorkspaceDialog({
    workspace,
    open,
    onOpenChange,
    onSave,
    onDelete
}: EditWorkspaceDialogProps) {
    const [name, setName] = useState(workspace.name);
    const [description, setDescription] = useState(workspace.description || "");
    const [minuteLimit, setMinuteLimit] = useState(workspace.minuteLimit || 1400);
    const [logoUrl, setLogoUrl] = useState(workspace.logoUrl || "");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setName(workspace.name);
            setDescription(workspace.description || "");
            setMinuteLimit(workspace.minuteLimit || 1400);
            setLogoUrl(workspace.logoUrl || "");
        }
    }, [open, workspace]);

    const handleSave = () => {
        onSave({
            name,
            description,
            minuteLimit,
            logoUrl,
        });
        onOpenChange(false);
    };

    const handleCancel = () => {
        setName(workspace.name);
        setDescription(workspace.description || "");
        setMinuteLimit(workspace.minuteLimit || 1400);
        setLogoUrl(workspace.logoUrl || "");
        onOpenChange(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `workspace-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Failed to upload logo');
        } finally {
            setIsUploading(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <ThemedDialog open={open} onOpenChange={onOpenChange}>
            <ThemedDialogContent className="sm:max-w-md">
                <ThemedDialogHeader
                    title="Edit Workspace"
                    description="Update workspace details and settings"
                />

                <div className="space-y-5 mt-4">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-16 w-16 border-2 border-white/[0.08] shadow-lg transition-transform group-hover:scale-105">
                                <AvatarImage src={logoUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary text-lg font-light">
                                    {getInitials(name)}
                                </AvatarFallback>
                            </Avatar>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md group-hover:scale-110"
                            >
                                <UploadSimple size={14} weight="bold" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-2">
                            <Label htmlFor="workspace-name" className="text-sm font-medium">
                                Workspace Name
                            </Label>
                            <Input
                                id="workspace-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="backdrop-blur-sm"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                            Description (Optional)
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[100px] resize-none backdrop-blur-sm"
                            placeholder="Brief description of this workspace..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="minute-limit" className="text-sm font-medium">
                            Monthly Allocated Minutes
                        </Label>
                        <Input
                            id="minute-limit"
                            type="number"
                            value={minuteLimit}
                            onChange={(e) => setMinuteLimit(Number(e.target.value))}
                            className="backdrop-blur-sm"
                            min="0"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/[0.08]">
                    {onDelete ? (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
                                    onDelete();
                                }
                            }}
                            className="px-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                        >
                            Delete Workspace
                        </Button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            className="px-6 hover:bg-white/[0.05]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="px-6"
                            disabled={!name.trim() || isUploading}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </ThemedDialogContent>
        </ThemedDialog>
    );
}
