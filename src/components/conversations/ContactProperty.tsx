import React from "react";
import { Button } from "@/components/ui/button";
import { Edit2, LucideIcon } from "lucide-react";

interface ContactPropertyProps {
  label: string;
  value: string;
  icon: LucideIcon;
  editable?: boolean;
}

export function ContactProperty({ label, value, icon: Icon, editable = true }: ContactPropertyProps) {
  const handleEdit = () => {
    // TODO: Implement property editing
    console.log("Edit property:", label);
  };

  return (
    <div className="flex items-center justify-between p-2 bg-card/30 rounded-md border border-border/50 group hover:bg-card/50 transition-colors">
      <div className="flex items-center space-x-2 flex-1">
        <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground">{label}</div>
          <div className="text-xs text-foreground truncate">{value}</div>
        </div>
      </div>
      
      {editable && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 p-0"
        >
          <Edit2 className="w-2.5 h-2.5" />
        </Button>
      )}
    </div>
  );
}