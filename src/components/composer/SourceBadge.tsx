import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Globe,
    Buildings,
    User,
    ArrowDown,
    Star,
    Lightning
} from 'phosphor-react';

export type SourceType =
    | 'scratch'
    | 'platform_template'
    | 'agency_template'
    | 'deployed'
    | 'starter';

interface SourceBadgeProps {
    sourceType: SourceType;
    sourceName?: string; // e.g., template name or agency name
    className?: string;
    size?: 'sm' | 'default';
}

const sourceConfig: Record<SourceType, {
    icon: React.ElementType;
    label: string;
    color: string;
    bgColor: string;
}> = {
    scratch: {
        icon: Lightning,
        label: 'Created from scratch',
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10 border-slate-500/20',
    },
    platform_template: {
        icon: Globe,
        label: 'Platform Template',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    agency_template: {
        icon: Buildings,
        label: 'Agency Template',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10 border-purple-500/20',
    },
    deployed: {
        icon: ArrowDown,
        label: 'Deployed',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10 border-green-500/20',
    },
    starter: {
        icon: Star,
        label: 'Getting Started',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
};

export function SourceBadge({
    sourceType,
    sourceName,
    className,
    size = 'default'
}: SourceBadgeProps) {
    const config = sourceConfig[sourceType];
    const Icon = config.icon;

    const displayLabel = sourceName
        ? sourceType === 'deployed'
            ? `Deployed by ${sourceName}`
            : `From: ${sourceName}`
        : config.label;

    return (
        <Badge
            variant="outline"
            className={cn(
                'font-normal gap-1.5',
                config.bgColor,
                config.color,
                size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs',
                className
            )}
        >
            <Icon size={size === 'sm' ? 10 : 12} weight="duotone" />
            <span className="truncate max-w-[120px]">{displayLabel}</span>
        </Badge>
    );
}

// Compact version for table cells
export function SourceIndicator({
    sourceType,
    className
}: {
    sourceType: SourceType;
    className?: string;
}) {
    const config = sourceConfig[sourceType];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'w-6 h-6 rounded flex items-center justify-center',
                config.bgColor,
                className
            )}
            title={config.label}
        >
            <Icon size={14} weight="duotone" className={config.color} />
        </div>
    );
}
