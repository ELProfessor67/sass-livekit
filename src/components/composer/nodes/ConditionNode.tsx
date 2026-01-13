import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { getIntegrationIcon } from '../data/integrationActions';

export const ConditionNode = memo((props: NodeProps<any>) => {
    const nodeData: BaseNodeData = {
        ...props.data,
        icon: getIntegrationIcon('Condition', 16),
        iconBgClass: "bg-amber-500/10 border border-amber-500/20",
        type: 'Condition',
    };

    return <BaseNode {...props} data={nodeData} />;
});

ConditionNode.displayName = 'ConditionNode';
