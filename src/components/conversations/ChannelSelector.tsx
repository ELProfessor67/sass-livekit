import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Phone, Smartphone, MessageCircle } from "lucide-react";

export type MessageChannel = 'imessage' | 'sms' | 'whatsapp' | 'call';

interface ChannelSelectorProps {
  selectedChannel: MessageChannel;
  onChannelChange: (channel: MessageChannel) => void;
  availableChannels?: MessageChannel[];
}

const channelConfig = {
  imessage: {
    label: "iMessage",
    icon: MessageSquare,
    description: "Send via iMessage (fallback to SMS)"
  },
  sms: {
    label: "SMS",
    icon: Smartphone,
    description: "Send via SMS"
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    description: "Send via WhatsApp"
  },
  call: {
    label: "Call",
    icon: Phone,
    description: "Initiate a call"
  }
};

export function ChannelSelector({ 
  selectedChannel, 
  onChannelChange, 
  availableChannels = ['imessage', 'sms', 'whatsapp', 'call'] 
}: ChannelSelectorProps) {
  const currentChannel = channelConfig[selectedChannel];
  const IconComponent = currentChannel.icon;

  return (
    <Select value={selectedChannel} onValueChange={onChannelChange}>
      <SelectTrigger className="w-auto h-9 px-3 bg-gray-800/90 border border-gray-700/60 text-white hover:bg-gray-700/90 hover:border-gray-600/80 transition-all duration-200 focus:bg-gray-800/90 focus:border-gray-600/80 focus:ring-0 data-[state=open]:bg-gray-800/90 data-[state=open]:border-gray-600/80">
        <div className="flex items-center space-x-2">
          <IconComponent className="h-4 w-4 text-gray-300" />
          <span className="text-sm font-medium text-white">{currentChannel.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-gray-800/95 border-gray-700/60 backdrop-blur-sm">
        {availableChannels.map((channel) => {
          const config = channelConfig[channel];
          const ChannelIcon = config.icon;
          
          return (
            <SelectItem 
              key={channel} 
              value={channel} 
              className="text-white hover:bg-gray-700/50"
            >
              <div className="flex items-center space-x-2">
                <ChannelIcon className="h-4 w-4 text-gray-300" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{config.label}</span>
                  <span className="text-xs text-gray-400">{config.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
