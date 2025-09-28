
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem', /* 32px */
      },
      colors: {
        background: {
          DEFAULT: 'hsl(var(--background))', 
          foreground: 'hsl(var(--foreground))'
        },
        foreground: 'hsl(var(--foreground))', 
        border: 'hsl(var(--border))', 
        input: 'hsl(var(--input))', 
        ring: 'hsl(var(--ring))', 
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        }
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'hsl(var(--foreground))', 
            '--tw-prose-headings': 'hsl(var(--foreground))', 
            '--tw-prose-links': 'hsl(var(--primary))', 
          }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    { pattern: /border-(.*)\/20/, variants: ['hover', 'dark:hover'] }
  ],
  variants: {
    extend: {
      borderColor: ['dark', 'hover', 'dark:hover'],
      opacity: ['dark', 'hover', 'dark:hover']
    }
  }
} satisfies Config;
