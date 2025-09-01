
import React from "react";
import { PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing } from "lucide-react";
import { Call } from "@/components/calls/types";

interface CallIconProps {
  call: Call;
  size?: number;
  className?: string;
}

export function CallIcon({ call, size = 16, className = "" }: CallIconProps) {
  if (call.status === 'Missed' || call.resolution?.toLowerCase().includes('dropped')) {
    return <PhoneMissed size={size} className={`text-red-500 ${className}`} />;
  } else if (call.direction === 'Outbound') {
    return <PhoneOutgoing size={size} className={`text-blue-500 ${className}`} />;
  } else if (call.status === 'Call Dropped') {
    return <PhoneOff size={size} className={`text-gray-500 ${className}`} />;
  } else {
    return <PhoneIncoming size={size} className={`text-green-500 ${className}`} />;
  }
}
