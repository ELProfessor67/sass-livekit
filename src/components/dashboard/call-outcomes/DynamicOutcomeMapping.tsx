import React from 'react';
import { Calendar, AlertCircle, MessageSquare, PhoneOff, Check, CheckCircle, ShoppingCart, FileText, User, Clock, ArrowUp, XCircle, UserMinus, MessageCircle, AlertTriangle } from "lucide-react";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";

const iconMap: Record<string, React.ReactElement> = {
  Calendar: <Calendar className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  PhoneOff: <PhoneOff className="w-4 h-4" />,
  Check: <Check className="w-4 h-4" />,
  CheckCircle: <CheckCircle className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  User: <User className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  ArrowUp: <ArrowUp className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  UserMinus: <UserMinus className="w-4 h-4" />,
  MessageCircle: <MessageCircle className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />
};

export const useDynamicOutcomeMapping = () => {
  const { config } = useBusinessUseCase();
  
  // Convert the config outcomes to the mapping format expected by existing components
  const outcomeMapping = React.useMemo(() => {
    const mapping: Record<string, { name: string; color: string; icon: React.ReactElement }> = {};
    
    config.outcomes.forEach(outcome => {
      const key = outcome.key.toLowerCase();
      mapping[key] = {
        name: outcome.label,
        color: outcome.color,
        icon: iconMap[outcome.icon] || iconMap.AlertCircle
      };
    });
    
    return mapping;
  }, [config]);
  
  return outcomeMapping;
};