import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { getIntegrationIcon } from '../data/integrationActions';

export const DelayNode = memo((props: NodeProps<any>) => {
    const nodeData: BaseNodeData = {
        ...props.data,
        icon: getIntegrationIcon('Delay', 16),
        iconBgClass: "bg-muted/30 border border-muted-foreground/20",
        type: 'Delay',
    };

    return <BaseNode {...props} data={nodeData} />;
});

DelayNode.displayName = 'DelayNode';
