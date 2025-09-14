import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const glassCardVariants = cva(
  "rounded-2xl border border-border/30 dark:border-white/20 bg-border/10 dark:bg-white/10 backdrop-blur-md text-card-foreground shadow-xl transition-all duration-300",
  {
    variants: {
      variant: {
        default: "",
        premium: "hover:shadow-2xl hover:shadow-primary/5",
        enterprise: "hover:shadow-2xl hover:shadow-primary/10",
        light: "",
        ultra: "hover:shadow-2xl hover:shadow-white/5"
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  hover?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glassCardVariants({ variant, size }),
          hover && "hover:scale-105 hover:shadow-2xl hover:shadow-white/5",
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard, glassCardVariants }