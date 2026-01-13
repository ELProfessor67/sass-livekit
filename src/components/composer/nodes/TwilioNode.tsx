import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { TwilioIcon } from './IntegrationIcons';

export const TwilioNode = memo((props: NodeProps<any>) => {
    const label = props.data.label || 'Send SMS';

    const nodeData: BaseNodeData = {
        ...props.data,
        label: label,
        icon: <TwilioIcon size={16} />,
        iconBgClass: "bg-red-500/10 border border-red-500/20",
        type: 'Twilio SMS',
    };

    return <BaseNode {...props} data={nodeData} />;
});

TwilioNode.displayName = 'TwilioNode';
