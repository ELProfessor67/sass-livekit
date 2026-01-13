export type TemplateVisibility = 'platform' | 'agency' | 'user';

export type TemplateCategory =
    | 'proactive'
    | 'notifications'
    | 'triaging'
    | 'integrations'
    | 'general';

export interface TemplateNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'delay';
    label: string;
    icon?: string;
}

export interface TemplateEdge {
    id: string;
    source: string;
    target: string;
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    visibility: TemplateVisibility;
    icon: string;
    nodes: TemplateNode[];
    edges: TemplateEdge[];
    usage_count: number;
    is_featured: boolean;
    created_by: string;
    agency_name?: string;
    created_at: string;
}

export interface MockClientLocation {
    id: string;
    name: string;
    agency_id: string;
}
