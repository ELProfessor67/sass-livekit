
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type UIStyle = "glass" | "minimal";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultUIStyle?: UIStyle;
  storageKey?: string;
  uiStyleStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  uiStyle: UIStyle;
  setTheme: (theme: Theme) => void;
  setUIStyle: (uiStyle: UIStyle) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  uiStyle: "glass",
  setTheme: () => null,
  setUIStyle: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultUIStyle = "glass",
  storageKey = "vite-ui-theme",
  uiStyleStorageKey = "vite-ui-style",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [uiStyle, setUIStyle] = useState<UIStyle>(
    () => (localStorage.getItem(uiStyleStorageKey) as UIStyle) || defaultUIStyle
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "glass-ui", "minimal-ui");

    // Apply color theme
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Apply UI style
    root.classList.add(`${uiStyle}-ui`);
  }, [theme, uiStyle]);

  const value = {
    theme,
    uiStyle,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setUIStyle: (uiStyle: UIStyle) => {
      localStorage.setItem(uiStyleStorageKey, uiStyle);
      setUIStyle(uiStyle);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
