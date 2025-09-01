import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap liquid-rounded-md text-sm font-medium liquid-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "rounded-2xl bg-foreground/40 backdrop-blur-md border border-foreground/30 text-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:bg-foreground/50 hover:shadow-2xl hover:shadow-foreground/20 active:scale-95",
        destructive:
          "liquid-glass-medium bg-destructive/20 text-destructive-foreground border border-destructive/30 hover:bg-destructive/30 hover:scale-[1.02]",
        "destructive-glass":
          "rounded-2xl tracking-tighter backdrop-blur-md bg-destructive/20 border border-destructive/40 text-destructive shadow-xl transition-all duration-300 hover:scale-105 hover:bg-destructive/30 hover:shadow-2xl hover:shadow-destructive/30 active:scale-95",
        outline:
          "liquid-glass-light border border-foreground/[0.12] text-foreground hover:liquid-glass-medium hover:border-foreground/[0.2] hover:scale-[1.02]",
        secondary:
          "rounded-xl bg-foreground/25 backdrop-blur-md border border-foreground/20 text-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:bg-foreground/35 hover:shadow-2xl hover:shadow-foreground/10 active:scale-95",
        "glass-secondary":
          "rounded-xl bg-foreground/25 backdrop-blur-md border border-foreground/20 text-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:bg-foreground/35 hover:shadow-2xl hover:shadow-foreground/10 active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground/20",
        "glass-outline":
          "rounded-xl bg-foreground/15 backdrop-blur-md border-2 border-foreground/30 text-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:bg-foreground/25 hover:border-foreground/40 hover:shadow-2xl active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground/20",
        ghost: "text-foreground/80 hover:liquid-glass-light hover:text-foreground hover:scale-[1.02]",
        link: "text-primary underline-offset-4 hover:underline text-foreground/90 hover:text-foreground",
        premium: "liquid-glass-premium text-foreground hover:liquid-glass-ultra-premium hover:scale-[1.02] shadow-[var(--shadow-glass-lg)] hover:shadow-[var(--shadow-glass-xl)]",
        glass: "liquid-glass-heavy text-foreground hover:liquid-glass-ultra-premium hover:scale-[1.02] warm-highlight",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 liquid-rounded-md px-3",
        lg: "h-11 liquid-rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
