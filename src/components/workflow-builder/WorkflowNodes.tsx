import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Zap, MessageSquare, Globe } from 'lucide-react';

export type WorkflowNodeData = {
    label?: string;
    to_number?: string;
    message?: string;
    url?: string;
    method?: string;
    fields?: string[];
};

export type WorkflowNode = Node<WorkflowNodeData>;

export function TriggerNode({ data, selected }: NodeProps<WorkflowNode>) {
    return (
        <div className={`w-64 rounded-[2rem] bg-white border transition-all duration-300 ${selected ? 'border-primary shadow-[0_20px_50px_rgba(255,74,113,0.15)] scale-[1.02] z-50' : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-xl">
                        <Zap className="h-4 w-4 text-orange-500" />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Trigger</span>
                </div>
            </div>
            <div className="p-6">
                <div className="text-[12px] text-slate-600 font-medium leading-relaxed">
                    {data.label || "Activates immediately after post-call analysis completes."}
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-primary !border-[3px] !border-white !shadow-lg hover:!scale-150 transition-transform !-right-2"
            />
        </div>
    );
}

export function TwilioSMSNode({ data, selected }: NodeProps<WorkflowNode>) {
    return (
        <div className={`w-64 rounded-[2rem] bg-white border transition-all duration-300 ${selected ? 'border-primary shadow-[0_20px_50px_rgba(255,74,113,0.15)] scale-[1.02] z-50' : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Twilio SMS</span>
                </div>
            </div>
            <div className="p-6">
                <div className="text-[12px] text-slate-600 font-medium leading-relaxed">
                    {data.to_number ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">To Number</span>
                            <span className="text-slate-900 font-bold">{data.to_number}</span>
                        </div>
                    ) : "Configure target number..."}
                </div>
            </div>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-slate-300 !border-[3px] !border-white !shadow-sm hover:!bg-primary transition-all !-left-2"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-primary !border-[3px] !border-white !shadow-lg hover:!scale-150 transition-transform !-right-2"
            />
        </div>
    );
}

export function WebhookNode({ data, selected }: NodeProps<WorkflowNode>) {
    return (
        <div className={`w-64 rounded-[2rem] bg-white border transition-all duration-300 ${selected ? 'border-primary shadow-[0_20px_50px_rgba(255,74,113,0.15)] scale-[1.02] z-50' : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-xl">
                        <Globe className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Webhook</span>
                </div>
            </div>
            <div className="p-6">
                <div className="text-[12px] text-slate-600 font-medium leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
                    {data.url ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">{data.method || 'POST'} To</span>
                            <span className="text-slate-900 font-bold font-mono text-[10px]">
                                {(() => {
                                    try {
                                        return new URL(data.url).hostname;
                                    } catch {
                                        return data.url;
                                    }
                                })()}
                            </span>
                        </div>
                    ) : "Configure webhook URL..."}
                </div>
            </div>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-slate-300 !border-[3px] !border-white !shadow-sm hover:!bg-primary transition-all !-left-2"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-primary !border-[3px] !border-white !shadow-lg hover:!scale-150 transition-transform !-right-2"
            />
        </div>
    );
}
