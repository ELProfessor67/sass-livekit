import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl backdrop-blur-xl bg-card/50",
          "px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
          "border border-border/50 transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary/40",
          "focus-visible:bg-card/70 focus-visible:backdrop-blur-2xl",
          "hover:border-border/70 hover:bg-card/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
