
import React from 'react';
import { Calendar, AlertCircle, MessageSquare, PhoneOff, Check } from "lucide-react";

export const outcomeMapping = {
  'booked appointment': { 
    name: "Booked Appointment", 
    color: "hsl(142 76% 36%)", // Deep success green
    icon: <Calendar className="w-4 h-4" /> 
  },
  'appointment': { 
    name: "Booked Appointment", 
    color: "hsl(142 76% 36%)", // Deep success green
    icon: <Calendar className="w-4 h-4" /> 
  },
  'not qualified': { 
    name: "Not Qualified", 
    color: "hsl(45 93% 47%)", // Professional amber
    icon: <AlertCircle className="w-4 h-4" /> 
  },
  'not eligible': { 
    name: "Not Qualified", 
    color: "hsl(45 93% 47%)", // Professional amber
    icon: <AlertCircle className="w-4 h-4" /> 
  },
  'spam': { 
    name: "Spam", 
    color: "hsl(0 72% 51%)", // Confident red
    icon: <AlertCircle className="w-4 h-4" /> 
  },
  'escalated': { 
    name: "Escalated", 
    color: "hsl(217 91% 60%)", // Distinct corporate blue
    icon: <MessageSquare className="w-4 h-4" /> 
  },
  'message to franchisee': { 
    name: "Message to Franchisee", 
    color: "hsl(217 91% 60%)", // Distinct corporate blue
    icon: <MessageSquare className="w-4 h-4" /> 
  },
  'call dropped': {
    name: "Call Dropped",
    color: "hsl(215 28% 17%)", // Neutral charcoal
    icon: <PhoneOff className="w-4 h-4" />
  },
  'completed': {
    name: "Completed",
    color: "hsl(142 76% 36%)", // Deep success green
    icon: <Check className="w-4 h-4" />
  }
};
