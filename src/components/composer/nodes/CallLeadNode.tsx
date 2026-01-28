import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { PhoneCall } from 'lucide-react';

export const CallLeadNode = memo((props: NodeProps<any>) => {
    const label = props.data.label || 'Call Lead';

    const nodeData: BaseNodeData = {
        ...props.data,
        label: label,
        icon: <PhoneCall className="w-4 h-4 text-primary" />,
        iconBgClass: "bg-primary/10 border border-primary/20",
        type: 'Call Lead',
    };

    return <BaseNode {...props} data={nodeData} />;
});

CallLeadNode.displayName = 'CallLeadNode';
