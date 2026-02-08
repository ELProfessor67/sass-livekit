import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Clock } from 'phosphor-react';

export const WaitNode = memo((props: NodeProps<any>) => {
    const label = props.data.label || 'Wait';
    const amount = props.data.wait_amount || 0;
    const unit = props.data.wait_unit || 'minutes';

    const nodeData: BaseNodeData = {
        ...props.data,
        label: label,
        icon: <Clock size={16} weight="duotone" className="text-amber-500" />,
        iconBgClass: "bg-amber-500/10 border border-amber-500/20",
        type: 'Wait',
    };

    return <BaseNode {...props} data={nodeData} />;
});

WaitNode.displayName = 'WaitNode';
