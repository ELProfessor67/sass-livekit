
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    trackClassName?: string;
    thumbClassName?: string;
    orientation?: "horizontal" | "vertical";
  }
>(({ className, trackClassName, thumbClassName, orientation = "horizontal", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex touch-none select-none",
      orientation === "horizontal" ? "w-full items-center" : "h-full flex-col items-center",
      className
    )}
    orientation={orientation}
    {...props}
  >
    <SliderPrimitive.Track 
      className={cn(
        "relative overflow-hidden rounded-full bg-secondary",
        orientation === "horizontal" ? "h-2 w-full" : "w-2 h-full",
        trackClassName
      )}
    >
      <SliderPrimitive.Range className={cn(
        "absolute bg-primary",
        orientation === "horizontal" ? "h-full" : "w-full bottom-0"
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(
      "block rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      orientation === "horizontal" ? "h-5 w-5" : "h-5 w-5",
      thumbClassName
    )} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
