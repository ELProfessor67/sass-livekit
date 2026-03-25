import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemedDialog, ThemedDialogContent, ThemedDialogHeader } from "@/components/ui/themed-dialog";
import { UploadSimple } from "phosphor-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateWorkspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (workspace: {
        name: string;
        description?: string;
        logoUrl?: string;
        minuteLimit: number;
    }) => void;
}

export function CreateWorkspaceDialog({
    open,
    onOpenChange,
    onCreate
}: CreateWorkspaceDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [minuteLimit, setMinuteLimit] = useState(1400);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreate = () => {
        onCreate({
            name,
            description: description || undefined,
            logoUrl: logoUrl || undefined,
            minuteLimit,
        });

        // Reset form
        setName("");
        setDescription("");
        setLogoUrl("");
        setMinuteLimit(1400);
        onOpenChange(false);
    };

    const handleCancel = () => {
        // Reset form
        setName("");
        setDescription("");
        setLogoUrl("");
        setMinuteLimit(1400);
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
        if (!name) return "NW";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <ThemedDialog open={open} onOpenChange={onOpenChange}>
            <ThemedDialogContent className="sm:max-w-md">
                <ThemedDialogHeader
                    title="Create Workspace"
                    description="Set up a new workspace for your team"
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

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/[0.08]">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="px-6 hover:bg-white/[0.05]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        className="px-6"
                        disabled={!name.trim() || isUploading}
                    >
                        Create Workspace
                    </Button>
                </div>
            </ThemedDialogContent>
        </ThemedDialog>
    );
}
