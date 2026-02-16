
import React from 'react';
import { Calendar, AlertCircle, MessageSquare, PhoneOff, Check, PhoneCallIcon } from "lucide-react";

export const outcomeMapping = {
  'booked appointment': {
    name: "Booked Appointment",
    color: "#10B981",
    icon: <Calendar className="w-4 h-4" />
  },
  'appointment': {
    name: "Booked Appointment",
    color: "#10B981",
    icon: <Calendar className="w-4 h-4" />
  },
  'escalated': {
    name: "Escalated",
    color: "#0EA5E9",
    icon: <MessageSquare className="w-4 h-4" />
  },
  'not qualified': {
    name: "Not Qualified",
    color: "#F59E0B",
    icon: <AlertCircle className="w-4 h-4" />
  },
  'not eligible': {
    name: "Not Qualified",
    color: "#F59E0B",
    icon: <AlertCircle className="w-4 h-4" />
  },
  'scam': {
    name: "Scam",
    color: "#EF4444",
    icon: <AlertCircle className="w-4 h-4" />
  },
  'completed': {
    name: "Scam",
    color: "#EF4444",
    icon: <AlertCircle className="w-4 h-4" />
  },
  'call dropped': {
    name: "Call Dropped",
    color: "#818CF8",
    icon: <PhoneOff className="w-4 h-4" />
  },
  'qualified': {
    name: "Qualified",
    color: "#818CF8",
    icon: <PhoneCallIcon className="w-4 h-4" />
  },
};
