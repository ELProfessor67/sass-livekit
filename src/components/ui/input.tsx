import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl backdrop-blur-xl bg-card/50",
          "px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
          "border border-border/50 transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary/40",
          "focus-visible:bg-card/70 focus-visible:backdrop-blur-2xl",
          "hover:border-border/70 hover:bg-card/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
