import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Webhook } from 'lucide-react';

export const TriggerNode = memo((props: NodeProps<any>) => {
    const nodeData: BaseNodeData = {
        ...props.data,
        icon: <Webhook className="w-4 h-4 text-green-500" />,
        iconBgClass: "bg-green-500/10 border border-green-500/20",
        type: 'Trigger',
    };

    return <BaseNode {...props} data={nodeData} />;
});

TriggerNode.displayName = 'TriggerNode';
