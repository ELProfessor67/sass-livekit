import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface ThemedDialogProps extends React.ComponentProps<typeof Dialog> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface ThemedDialogContentProps extends React.ComponentProps<typeof DialogContent> {
  children: React.ReactNode;
  className?: string;
}

interface ThemedDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface ThemedDialogHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

const ThemedDialog = ({ open, onOpenChange, children, ...props }: ThemedDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </Dialog>
  );
};

const ThemedDialogTrigger = ({ children, asChild = true }: ThemedDialogTriggerProps) => {
  return (
    <DialogTrigger asChild={asChild}>
      {children}
    </DialogTrigger>
  );
};

const ThemedDialogContent = ({ 
  children, 
  className,
  ...props 
}: ThemedDialogContentProps) => {
  const { uiStyle } = useTheme();
  
  const getDialogClasses = () => {
    if (uiStyle === "glass") {
      return cn(
        // Glass effect with backdrop blur
        "backdrop-blur-xl border transition-all duration-300",
        "shadow-2xl border sm:max-w-2xl rounded-xl",
        // Light mode - more opaque for better text legibility
        "bg-white/[0.85] border-border/60 shadow-black/[0.1]",
        // Dark mode overrides
        "dark:bg-white/[0.08] dark:border-white/[0.15] dark:shadow-black/[0.3]"
      );
    } else {
      return cn(
        "bg-card border-border/60",
        "shadow-2xl border",
        "sm:max-w-2xl rounded-xl"
      );
    }
  };

  return (
    <DialogContent 
      className={cn(getDialogClasses(), className)}
      style={{ zIndex: 9999 }}
      {...props}
    >
      {children}
    </DialogContent>
  );
};

const ThemedDialogHeader = ({ 
  title, 
  description, 
  className 
}: ThemedDialogHeaderProps) => {
  return (
    <DialogHeader className={cn("space-y-3", className)}>
      <div 
        className="text-lg font-light text-white"
        style={{ 
          color: '#ffffff !important',
          fontSize: '18px',
          fontWeight: '300'
        }}
      >
        {title}
      </div>
      {description && (
        <div 
          className="text-sm leading-relaxed text-white/80"
          style={{ 
            color: 'rgba(255, 255, 255, 0.8) !important',
            fontSize: '14px'
          }}
        >
          {description}
        </div>
      )}
    </DialogHeader>
  );
};

export {
  ThemedDialog,
  ThemedDialogTrigger,
  ThemedDialogContent,
  ThemedDialogHeader,
};
