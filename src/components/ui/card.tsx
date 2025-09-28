import * as React from "react"
import { useTheme } from "@/components/ThemeProvider"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "glass-light" | "glass-heavy" | "glass-reading" | "premium" | "ultra-premium" | "enterprise" | "liquid" | "frosted-premium" | "transparent" | "elevated" | "premium-enhanced"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const { uiStyle } = useTheme()
  
  const getThemeClasses = () => {
    if (variant === "transparent") return "bg-transparent border-transparent shadow-none";
    
    if (uiStyle === "glass") {
      switch (variant) {
        case "glass-light":
          return "card-glass-light"
        case "glass-heavy":
          return "card-glass-heavy"
        case "glass-reading":
          return "card-glass-reading"
        case "premium":
          return "card-premium-glass"
        case "ultra-premium":
          return "card-ultra-premium-glass"
        case "enterprise":
          return "glass-enterprise"
        case "liquid":
        case "frosted-premium":
          return "card-premium-glass"
        default:
          return "card-glass"
      }
    } else {
      // minimal theme
      switch (variant) {
        case "elevated":
          return "card-elevated-minimal"
        case "premium-enhanced":
          return "card-premium-enhanced-minimal"
        case "premium":
        case "ultra-premium":
        case "enterprise":
        case "liquid":
        case "frosted-premium":
          return "card-premium-minimal"
        default:
          return "card-minimal"
      }
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        getThemeClasses(),
        "text-card-foreground transition-all duration-300",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { uiStyle } = useTheme()
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        uiStyle === "minimal" ? "rounded-t-3xl" : "rounded-t-xl",
        className
      )}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    variant?: "default" | "glass" | "premium" | "ultra"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "text-2xl font-semibold leading-none tracking-tight text-foreground",
    glass: "text-2xl font-semibold leading-none tracking-tight text-glass-enhanced",
    premium: "text-2xl font-bold leading-none tracking-tight text-glass-premium",
    ultra: "text-3xl font-bold leading-none tracking-tight text-glass-premium drop-shadow-lg"
  };

  return (
    <h3
      ref={ref}
      className={cn(
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
