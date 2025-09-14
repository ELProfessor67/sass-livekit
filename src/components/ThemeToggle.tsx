import { MoonStar, SunDim, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Toggle } from "./ui/toggle";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full bg-sidebar-accent/20 hover:bg-sidebar-accent/40 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
          <SunDim className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-amber-400 drop-shadow-sm" />
          <MoonStar className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-indigo-500 drop-shadow-sm" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl">
        <DropdownMenuItem onClick={() => setTheme("light")} className="group cursor-pointer rounded-md transition-all duration-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/30">
          <SunDim className="mr-2 h-4 w-4 text-amber-500 transition-colors group-hover:text-amber-600" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="group cursor-pointer rounded-md transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30">
          <MoonStar className="mr-2 h-4 w-4 text-indigo-500 transition-colors group-hover:text-indigo-600" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="group cursor-pointer rounded-md transition-all duration-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/30">
          <Monitor className="mr-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleMinimal() {
  const { theme, setTheme } = useTheme();

  return (
    <Toggle
      variant="pill"
      size="icon"
      pressed={theme === "dark"}
      onPressedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full bg-sidebar-accent/20 hover:bg-sidebar-accent/40 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <MoonStar className="h-4 w-4 text-indigo-500 drop-shadow-sm transition-all duration-300" />
      ) : (
        <SunDim className="h-4 w-4 text-amber-400 drop-shadow-sm transition-all duration-300" />
      )}
    </Toggle>
  );
}