import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "glass-button text-indigo-500 hover:text-[#0d0e11]",
        primary: "bg-[#b7aaff] text-[#0d0e11] hover:bg-[#b7aaff]/90 shadow-lg hover:shadow-xl hover:shadow-[#b7aaff]/25",
        secondary: "glass-button text-[#0f0f13] hover:bg-[#f3f3fa]/80",
        premium: "glass-card-premium text-indigo-500 hover:text-indigo-500 glow-ambient hover:scale-105",
        enterprise: "glass-card-enterprise text-indigo-500 hover:text-indigo-500 border-[#b7aaff]/30 hover:border-[#b7aaff]/50",
        ghost: "hover:bg-glass-background/20 hover:text-indigo-500 transition-colors",
        outline: "border border-glass-[#d8d9e8]/50 bg-transparent hover:bg-glass-background/20 hover:border-[#b7aaff]/30"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-8",
        xl: "h-12 px-10 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof glassButtonVariants> {
  asChild?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GlassButton.displayName = "GlassButton"

export { GlassButton, glassButtonVariants }