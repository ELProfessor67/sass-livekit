import { useAccountRoleContext, AccountRole } from '@/hooks/useAccountRole';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, Buildings, User, CaretDown, Check } from 'phosphor-react';
import { cn } from '@/lib/utils';
import React from 'react';

const roleOptions: {
    value: AccountRole;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
}[] = [
        {
            value: 'platform_owner',
            label: 'Platform Owner',
            description: 'Manages all templates & starter workflows',
            icon: Crown,
            color: 'text-amber-500',
        },
        {
            value: 'agency',
            label: 'Agency',
            description: 'Deploys workflows to clients',
            icon: Buildings,
            color: 'text-blue-500',
        },
        {
            value: 'client',
            label: 'Client',
            description: 'Organizes workflows in folders',
            icon: User,
            color: 'text-green-500',
        },
    ];

interface RoleSwitcherProps {
    className?: string;
    variant?: 'default' | 'compact';
}

export function RoleSwitcher({ className, variant = 'default' }: RoleSwitcherProps) {
    const { role, setRole } = useAccountRoleContext();
    const currentRole = roleOptions.find((r) => r.value === role)!;
    const CurrentIcon = currentRole.icon;

    if (variant === 'compact') {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            'h-8 gap-2 border-dashed bg-background/50',
                            className
                        )}
                    >
                        <CurrentIcon size={14} weight="duotone" className={currentRole.color} />
                        <span className="text-xs font-medium">{currentRole.label}</span>
                        <CaretDown size={12} className="text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Switch View (Dev Mode)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {roleOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = role === option.value;
                        return (
                            <DropdownMenuItem
                                key={option.value}
                                onClick={() => setRole(option.value)}
                                className="flex items-center gap-3 py-2"
                            >
                                <Icon size={16} weight="duotone" className={option.color} />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{option.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {option.description}
                                    </div>
                                </div>
                                {isSelected && <Check size={14} className="text-primary" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 z-50',
                className
            )}
        >
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="gap-2 shadow-lg border-2 bg-background"
                    >
                        <CurrentIcon size={18} weight="duotone" className={currentRole.color} />
                        <span className="font-medium">{currentRole.label}</span>
                        <CaretDown size={14} className="text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Switch Role (Development Mode)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {roleOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = role === option.value;
                        return (
                            <DropdownMenuItem
                                key={option.value}
                                onClick={() => setRole(option.value)}
                                className="flex items-center gap-3 py-3"
                            >
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center',
                                        isSelected ? 'bg-primary/10' : 'bg-muted'
                                    )}
                                >
                                    <Icon size={18} weight="duotone" className={option.color} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{option.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {option.description}
                                    </div>
                                </div>
                                {isSelected && <Check size={16} className="text-primary" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
