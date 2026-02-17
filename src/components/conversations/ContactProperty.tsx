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
    <div className="flex items-center justify-between p-3 bg-white/[0.04] rounded-[var(--radius-lg)] border border-white/[0.08] group hover:bg-white/[0.08] transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</div>
          <div className="text-xs text-foreground truncate font-medium">{value}</div>
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