import React, { useState } from 'react';
import { CaretDown, Plus, Check, GearSix } from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchInput } from '@/components/ui/search-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface WorkspaceSwitcherProps {
    variant?: 'default' | 'logo';
}

export const WorkspaceSwitcher = ({ variant = 'default' }: WorkspaceSwitcherProps) => {
    const { workspaces, currentWorkspace, switchWorkspace, isLoading, canEdit } = useWorkspace();
    const { uiStyle } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    if (isLoading || !currentWorkspace) {
        return (
            <Button variant="ghost" disabled className="px-4 py-2 rounded-full text-sm font-sans tracking-tighter">
                Loading...
            </Button>
        );
    }

    const filteredWorkspaces = workspaces.filter(ws =>
        (ws.workspace_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string) => {
        if (!name) return 'MA';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (id: string | null) => {
        const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-emerald-500',
            'bg-orange-500',
            'bg-pink-500',
        ];
        if (!id) return colors[0]; // Default for Main Account
        const numId = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = numId % colors.length;
        return colors[index];
    };

    const trigger = variant === 'logo' ? (
        <Button
            variant="ghost"
            className={cn(
                "group relative p-0 h-10 w-10 rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
                uiStyle === "glass" ? "hover:bg-white/10" : "hover:bg-muted/50"
            )}
        >
            <Avatar className={cn(
                "h-10 w-10 transition-all duration-300",
                "group-hover:ring-2 group-hover:ring-primary/50"
            )}>
                {currentWorkspace.logo_url && (
                    <AvatarImage src={currentWorkspace.logo_url} alt={currentWorkspace.workspace_name} />
                )}
                <AvatarFallback className={cn(getAvatarColor(currentWorkspace.id), "text-white text-sm font-medium")}>
                    {getInitials(currentWorkspace.workspace_name)}
                </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-background rounded-full p-0.5">
                    <CaretDown size={10} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
                </div>
            </div>
        </Button>
    ) : (
        <Button
            variant="ghost"
            className={cn(
                "px-4 py-2 rounded-full text-sm font-sans tracking-tighter transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 text-muted-foreground hover:text-foreground",
                uiStyle === "glass" ? "hover:bg-white/10" : "hover:bg-muted/50"
            )}
        >
            <Avatar className="h-5 w-5">
                {currentWorkspace.logo_url && (
                    <AvatarImage src={currentWorkspace.logo_url} alt={currentWorkspace.workspace_name} />
                )}
                <AvatarFallback className={cn(getAvatarColor(currentWorkspace.id), "text-[8px] text-white")}>
                    {getInitials(currentWorkspace.workspace_name)}
                </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">{currentWorkspace.workspace_name}</span>
            <CaretDown size={16} className={cn("transition-transform", open && "rotate-180")} />
        </Button>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger}
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 rounded-2xl" align="start">
                {/* Search */}
                <div className="p-2">
                    <SearchInput
                        placeholder="Search workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 bg-white/5 border-white/10 focus-visible:ring-primary/20 text-sm placeholder:text-foreground/50"
                        iconClassName="h-3.5 w-3.5 text-foreground/50"
                    />
                </div>

                <Separator className="bg-border/40" />

                {/* Workspace List */}
                <ScrollArea className="max-h-64">
                    <div className="p-1">
                        {filteredWorkspaces.map((workspace) => {
                            const isActive = currentWorkspace.id === workspace.id;
                            return (
                                <button
                                    key={workspace.id}
                                    onClick={() => {
                                        switchWorkspace(workspace);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200",
                                        "hover:bg-white/5 group",
                                        isActive && "bg-white/10"
                                    )}
                                >
                                    <Avatar className="h-8 w-8 ring-1 ring-border/20 transition-all group-hover:ring-primary/20">
                                        {workspace.logo_url && (
                                            <AvatarImage src={workspace.logo_url} alt={workspace.workspace_name} />
                                        )}
                                        <AvatarFallback className={cn(getAvatarColor(workspace.id), "text-white text-xs")}>
                                            {getInitials(workspace.workspace_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {workspace.workspace_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground/70">
                                            {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                        {filteredWorkspaces.length === 0 && (
                            <div className="text-center py-8 text-sm text-muted-foreground/50">
                                No workspaces found
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <Separator className="bg-border/40" />

                {/* Footer Actions - Only for Owners who can edit */}
                {canEdit && currentWorkspace.role === 'owner' && (
                    <div className="p-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-sm text-foreground/80 hover:text-foreground py-1.5 h-auto rounded-xl"
                            onClick={() => {
                                setOpen(false);
                                toast.info("Navigate to settings to create a workspace");
                            }}
                        >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            New workspace
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-sm text-foreground/80 hover:text-foreground py-1.5 h-auto rounded-xl"
                            onClick={() => {
                                setOpen(false);
                                navigate('/settings?tab=workspace');
                            }}
                        >
                            <GearSix className="mr-2 h-3.5 w-3.5" />
                            Workspace settings
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};
