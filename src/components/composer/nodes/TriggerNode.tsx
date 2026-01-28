import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Webhook, Facebook, Calendar, Play } from 'lucide-react';
import { HubSpotIcon } from './IntegrationIcons';

export const TriggerNode = memo((props: NodeProps<any>) => {
    const getIcon = () => {
        switch (props.data.trigger_type) {
            case 'facebook_leads':
                return <Facebook className="w-4 h-4 text-[#1877F2]" />;
            case 'ghl_contact_created':
                return <Webhook className="w-4 h-4 text-[#7c3aed]" />;
            case 'schedule':
                return <Calendar className="w-4 h-4 text-blue-500" />;
            case 'manual':
                return <Play className="w-4 h-4 text-orange-500" />;
            default:
                if (props.data.trigger_type?.startsWith('hubspot_')) {
                    return <HubSpotIcon className="w-4 h-4" />;
                }
                return <Webhook className="w-4 h-4 text-green-500" />;
        }
    };

    const nodeData: BaseNodeData = {
        ...props.data,
        icon: getIcon(),
        iconBgClass: props.data.trigger_type === 'facebook_leads' ? "bg-[#1877F2]/10 border border-[#1877F2]/20" : "bg-green-500/10 border border-green-500/20",
        type: 'Trigger',
    };

    return <BaseNode {...props} data={nodeData} />;
});

TriggerNode.displayName = 'TriggerNode';
