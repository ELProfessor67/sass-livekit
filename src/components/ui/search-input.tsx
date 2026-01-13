import { cn } from "@/lib/utils"
import * as React from "react"
import { MagnifyingGlass } from "phosphor-react"
import { Input } from "./input"

interface SearchInputProps extends React.ComponentProps<"input"> {
  iconClassName?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, iconClassName, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <MagnifyingGlass 
          className={cn(
            "absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none",
            iconClassName
          )} 
        />
        <Input
          ref={ref}
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
