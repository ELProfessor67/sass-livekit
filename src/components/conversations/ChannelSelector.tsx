import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Check } from "lucide-react";

export type MessageChannel = 'sms' | 'whatsapp';

interface ChannelSelectorProps {
  selectedChannel: MessageChannel;
  onChannelChange: (channel: MessageChannel) => void;
  availableChannels?: MessageChannel[];
}

const channelConfig = {
  sms: {
    label: "SMS",
    icon: MessageCircle,
    color: "text-blue-400",
    description: "Standard text messaging"
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-500",
    description: "WhatsApp messaging"
  }
};

export function ChannelSelector({
  selectedChannel,
  onChannelChange,
  availableChannels = ['sms', 'whatsapp']
}: ChannelSelectorProps) {
  const currentChannel = channelConfig[selectedChannel];
  const IconComponent = currentChannel.icon;

  return (
    <Select value={selectedChannel} onValueChange={onChannelChange}>
      <SelectTrigger className="w-auto h-9 px-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 focus:bg-white/10 focus:border-white/20 focus:ring-0 data-[state=open]:bg-white/10 backdrop-blur-md rounded-lg">
        <div className="flex items-center space-x-2">
          <IconComponent className={`h-4 w-4 ${currentChannel.color}`} />
          <span className="text-sm font-medium text-white/90">{currentChannel.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-[#2D3B5A]/90 border-white/10 backdrop-blur-xl rounded-2xl p-1 min-w-[240px]">
        <div className="px-3 py-2 text-[13px] font-medium text-white/50">
          Select messaging channel
        </div>
        {availableChannels.map((channel) => {
          const config = channelConfig[channel];
          const ChannelIcon = config.icon;
          const isSelected = selectedChannel === channel;

          return (
            <SelectItem
              key={channel}
              value={channel}
              className={`
                relative flex items-center px-4 py-3 my-1 rounded-xl transition-colors cursor-pointer outline-none focus:bg-white/10
                ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
                [&>span:first-child]:hidden
              `}
            >
              <div className="flex items-center space-x-3 w-full">
                <div className={`p-2 rounded-full ${isSelected ? 'bg-white/10' : ''}`}>
                  <ChannelIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[15px] font-semibold text-white/90">{config.label}</span>
                  <span className="text-[12px] text-white/40">{config.description}</span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-blue-400" />
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
