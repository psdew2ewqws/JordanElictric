import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#060E16",
          900: "#0C1F2E",
          800: "#0F2536",
          700: "#14354D",
          600: "#1B4965",
          500: "#245D7E",
          400: "#3B9ECF",
          300: "#6BB8DB",
          200: "#A3D4EC",
          100: "#D4ECF7",
        },
        accent: "#3B9ECF",
        surface: "#0F2536",
        "surface-hover": "#162D42",
        "surface-raised": "#1A3750",
        "text-primary": "#E8ECF0",
        "text-secondary": "#8899A6",
        "text-muted": "#566A7A",
        "border-subtle": "#1E3A50",
        "border-active": "#3B9ECF",
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', "sans-serif"],
        body: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
        arabic: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', "sans-serif"],
      },
      fontSize: {
        "metric": ["2rem", { lineHeight: "1", fontWeight: "600" }],
        "metric-sm": ["1.25rem", { lineHeight: "1", fontWeight: "600" }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
