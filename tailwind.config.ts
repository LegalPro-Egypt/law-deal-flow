import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
      extend: {
        fontFamily: {
          'futura': ['Space Grotesk', 'sans-serif'],
          'modern': ['Inter', 'sans-serif'],
        },
        colors: {
          border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        ai: {
          primary: "hsl(var(--ai-primary))",
          "primary-glow": "hsl(var(--ai-primary-glow))",
          secondary: "hsl(var(--ai-secondary))",
          accent: "hsl(var(--ai-accent))",
          glass: "hsl(var(--ai-glass))",
          "glass-border": "hsl(var(--ai-glass-border))",
        },
          sidebar: {
            DEFAULT: "hsl(var(--sidebar-background))",
            foreground: "hsl(var(--sidebar-foreground))",
            primary: "hsl(var(--sidebar-primary))",
            "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
            accent: "hsl(var(--sidebar-accent))",
            "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
            border: "hsl(var(--sidebar-border))",
            ring: "hsl(var(--sidebar-ring))",
          },
          'neomorphism': {
            light: "hsl(248 17% 98%)",
            base: "hsl(240 13% 96%)", 
            shadow: "hsl(240 4% 85%)",
            highlight: "hsl(0 0% 100%)",
            primary: "hsl(217 91% 60%)",
            'primary-glow': "hsl(262 83% 68%)",
            accent: "hsl(262 83% 68%)",
          },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "slide-up-fade": {
          "0%": {
            opacity: "0",
            transform: "translateY(40px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-left": {
          "0%": {
            opacity: "0",
            transform: "translateX(-100px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "slide-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(100px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "slide-in-bottom": {
          "0%": {
            opacity: "0",
            transform: "translateY(50px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "drift-rotate": {
          "0%": {
            transform: "rotate(0deg) translate(0px, 0px)",
          },
          "25%": {
            transform: "rotate(90deg) translate(10px, -5px)",
          },
          "50%": {
            transform: "rotate(180deg) translate(0px, 10px)",
          },
          "75%": {
            transform: "rotate(270deg) translate(-10px, 5px)",
          },
          "100%": {
            transform: "rotate(360deg) translate(0px, 0px)",
          },
        },
        "gentle-pulse": {
          "0%, 100%": {
            opacity: "0.5",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.8",
            transform: "scale(1.05)",
          },
        },
        "hero-fade-in": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "card-slide-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(99, 102, 241, 0.6)" }
        },
        "float-orb": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(10px, -15px) scale(1.1)" },
          "50%": { transform: "translate(-5px, -25px) scale(0.9)" },
          "75%": { transform: "translate(-15px, -10px) scale(1.05)" }
        },
        "dot-blink": {
          "0%, 30%": { opacity: "1" },
          "35%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dot-blink": "dot-blink 1.4s ease-in-out infinite",
        "slide-up-fade": "slide-up-fade 0.8s ease-out forwards",
        "slide-in-left": "slide-in-left 0.4s ease-out 0.8s both",
        "slide-in-right": "slide-in-right 0.4s ease-out 0.8s both",
        "slide-in-bottom": "slide-in-bottom 0.4s ease-out 0.8s both",
        "hero-title": "slide-up-fade 0.6s ease-out 0.2s both",
        "hero-subtitle": "slide-up-fade 0.6s ease-out 0.4s both",
        "hero-button": "slide-up-fade 0.6s ease-out 0.6s both",
        "drift-rotate": "drift-rotate 20s ease-in-out infinite",
        "gentle-pulse": "gentle-pulse 4s ease-in-out infinite",
        "hero-fade-in": "hero-fade-in 1s ease-out",
        "card-slide-up": "card-slide-up 0.8s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float-orb": "float-orb 20s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
