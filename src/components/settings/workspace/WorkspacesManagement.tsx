import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, GearSix } from "phosphor-react";
import { useWorkspace, Workspace } from "@/contexts/WorkspaceContext";
import { EditWorkspaceDialog } from "./EditWorkspaceDialog";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { toast } from "sonner";

export function WorkspacesManagement() {
    const {
        workspaces,
        limitMinutesEnabled,
        setLimitMinutesEnabled,
        totalMinutes,
        updateWorkspace,
        addWorkspace,
        deleteWorkspace,
        canEdit,
    } = useWorkspace();

    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [settingsChanged, setSettingsChanged] = useState(false);

    const allocatedMinutes = workspaces.reduce((sum, ws) => sum + (ws.minuteLimit || 0), 0);
    const remainingMinutes = totalMinutes - allocatedMinutes;

    const handleToggleChange = (checked: boolean) => {
        setLimitMinutesEnabled(checked);
        setSettingsChanged(true);
    };

    const handleSaveSettings = () => {
        toast.success("Workspace settings saved successfully");
        setSettingsChanged(false);
    };

    const handleSaveWorkspace = async (updates: Partial<Workspace>) => {
        if (editingWorkspace) {
            try {
                await updateWorkspace(editingWorkspace.id, updates);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleCreateWorkspace = async (workspace: {
        name: string;
        description?: string;
        logoUrl?: string;
        minuteLimit: number;
    }) => {
        try {
            await addWorkspace(workspace);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteWorkspace = async (workspace: Workspace) => {
        try {
            await deleteWorkspace(workspace.id);
            setEditingWorkspace(null);
        } catch (error) {
            console.error(error);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "W";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Workspace Settings Card */}
            <Card className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl font-medium text-foreground">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <GearSix size={20} weight="duotone" />
                        </div>
                        Workspace Settings
                    </CardTitle>
                    <CardDescription className="leading-relaxed">
                        Control workspace minute allocation and usage limits
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300">
                        <div className="space-y-1">
                            <Label htmlFor="limit-minutes" className="text-sm font-medium text-foreground cursor-pointer">
                                Limit minutes
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Activate this to control how many minutes each workspace can use per month.
                            </p>
                        </div>
                        <Switch
                            id="limit-minutes"
                            checked={limitMinutesEnabled}
                            onCheckedChange={handleToggleChange}
                            disabled={!canEdit}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>

                    {settingsChanged && (
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleSaveSettings}
                                size="sm"
                                className="px-6 rounded-xl backdrop-blur-sm shadow-lg shadow-primary/20"
                            >
                                Save Changes
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Workspaces Table Card */}
            <Card className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="text-xl font-medium text-foreground">
                                Workspaces
                            </CardTitle>
                            <CardDescription className="mt-2 leading-relaxed">
                                You have allocated <span className="text-foreground font-medium">{allocatedMinutes}</span> of your total{' '}
                                <span className="text-foreground font-medium">{totalMinutes}</span> minutes.
                                {remainingMinutes > 0 && (
                                    <span className="text-muted-foreground">
                                        {' '}({remainingMinutes} remaining)
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            className="rounded-xl px-5 shadow-lg shadow-primary/10"
                            onClick={() => setShowCreateDialog(true)}
                            disabled={!canEdit}
                        >
                            <Plus size={16} weight="bold" className="mr-2" />
                            New Workspace
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/[0.08] bg-white/[0.02]">
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground py-4">Name</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right py-4">Limit</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right py-4">Used</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right py-4">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workspaces.map((workspace) => {
                                    const balance = (workspace.minuteLimit || 0) - (workspace.minutesUsed || 0);
                                    return (
                                        <TableRow
                                            key={workspace.id}
                                            className={`group border-white/[0.05] transition-all duration-200 ${canEdit ? 'cursor-pointer hover:bg-white/[0.04]' : 'opacity-80'}`}
                                            onClick={() => canEdit && setEditingWorkspace(workspace)}
                                        >
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-white/[0.1] shadow-sm transition-transform group-hover:scale-105">
                                                        <AvatarImage src={workspace.logoUrl} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                            {getInitials(workspace.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{workspace.name}</span>
                                                        {workspace.description && (
                                                            <span className="text-[11px] text-muted-foreground line-clamp-1">{workspace.description}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {workspace.minuteLimit || 0} min
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {workspace.minutesUsed || 0} min
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <span className={`text-sm font-medium ${balance > 0 ? 'text-foreground' : 'text-destructive'}`}>
                                                    {balance} min
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create Workspace Dialog */}
            <CreateWorkspaceDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onCreate={handleCreateWorkspace}
            />

            {/* Edit Workspace Dialog */}
            {editingWorkspace && (
                <EditWorkspaceDialog
                    workspace={editingWorkspace}
                    open={!!editingWorkspace}
                    onOpenChange={(open) => !open && setEditingWorkspace(null)}
                    onSave={handleSaveWorkspace}
                    onDelete={() => handleDeleteWorkspace(editingWorkspace)}
                />
            )}
        </div>
    );
}
