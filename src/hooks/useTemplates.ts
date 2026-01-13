import { useState, useMemo } from 'react';
import {
    WorkflowTemplate,
    TemplateVisibility,
    TemplateCategory,
    MockClientLocation
} from '@/types/workflowTemplates';

const mockTemplates: WorkflowTemplate[] = [];

const mockClientLocations: MockClientLocation[] = [];

interface UseTemplatesOptions {
    visibility?: TemplateVisibility;
    category?: TemplateCategory | 'all';
    search?: string;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
    const { visibility, category = 'all', search = '' } = options;
    const [isLoading] = useState(false);

    const templates = useMemo(() => {
        let filtered = [...mockTemplates];
        if (visibility) filtered = filtered.filter(t => t.visibility === visibility);
        if (category !== 'all') filtered = filtered.filter(t => t.category === category);
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(t => t.name.toLowerCase().includes(searchLower));
        }
        return filtered;
    }, [visibility, category, search]);

    const platformTemplates = useMemo(() => mockTemplates.filter(t => t.visibility === 'platform'), []);
    const agencyTemplates = useMemo(() => mockTemplates.filter(t => t.visibility === 'agency'), []);
    const userTemplates = useMemo(() => mockTemplates.filter(t => t.visibility === 'user'), []);

    return {
        templates,
        platformTemplates,
        agencyTemplates,
        userTemplates,
        allTemplates: mockTemplates,
        isLoading,
        platformCount: platformTemplates.length,
        agencyCount: agencyTemplates.length,
        userCount: userTemplates.length,
    };
}

export function useClientLocations() {
    return { locations: mockClientLocations, isLoading: false };
}

export function useTemplateActions() {
    const deployToClients = async (templateId: string, locationIds: string[]) => ({ success: true, count: locationIds.length });
    const createFromTemplate = async (templateId: string, name: string) => ({ success: true, workflowId: `wf-${Date.now()}` });
    const saveAsTemplate = async (data: any) => ({ success: true, templateId: `t-${Date.now()}` });
    return { deployToClients, createFromTemplate, saveAsTemplate };
}
