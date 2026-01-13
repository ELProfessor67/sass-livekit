import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Mail } from 'lucide-react';
import { getIntegrationIcon } from '../data/integrationActions';

export const ActionNode = memo((props: NodeProps<any>) => {
    const integration = props.data.integration;
    const label = props.data.label || 'Action';

    const nodeData: BaseNodeData = {
        ...props.data,
        label: label,
        icon: integration ? getIntegrationIcon(integration, 16) : <Mail className="w-4 h-4 text-primary" />,
        iconBgClass: "bg-primary/10 border border-primary/20",
        type: integration || 'Action',
    };

    return <BaseNode {...props} data={nodeData} />;
});

ActionNode.displayName = 'ActionNode';
