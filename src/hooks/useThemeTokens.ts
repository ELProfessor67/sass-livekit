
import { useTheme } from "@/components/ThemeProvider";

export function useThemeTokens() {
  const { theme } = useTheme();
  
  const getToken = (tokenPath: string) => {
    if (typeof window === 'undefined') return '';
    
    const rootStyles = getComputedStyle(document.documentElement);
    return rootStyles.getPropertyValue(tokenPath).trim();
  };
  
  const spacing = {
    xs: getToken('--space-xs'),
    sm: getToken('--space-sm'), 
    md: getToken('--space-md'),
    lg: getToken('--space-lg'),
    xl: getToken('--space-xl'),
    '2xl': getToken('--space-2xl'),
    '3xl': getToken('--space-3xl'),
    '4xl': getToken('--space-4xl')
  };
  
  const shadows = {
    xs: getToken('--shadow-xs'),
    sm: getToken('--shadow-sm'),
    md: getToken('--shadow-md'), 
    lg: getToken('--shadow-lg'),
    xl: getToken('--shadow-xl'),
    '2xl': getToken('--shadow-2xl'),
    glass: {
      sm: getToken('--shadow-glass-sm'),
      md: getToken('--shadow-glass-md'),
      lg: getToken('--shadow-glass-lg'),
      xl: getToken('--shadow-glass-xl')
    }
  };
  
  const transitions = {
    fast: getToken('--transition-fast'),
    base: getToken('--transition-base'),
    slow: getToken('--transition-slow'),
    spring: getToken('--transition-spring')
  };
  
  return {
    theme,
    spacing,
    shadows,
    transitions,
    getToken
  };
}
