import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0ea5a4", // тиркизно — доверба
          dark: "#0f766e",
          light: "#5eead4",
        },
        promo: "#f59e0b", // акцент за промовирани патувања
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(15,23,42,0.08), 0 4px 20px -4px rgba(15,23,42,0.10)",
        lift: "0 10px 30px -8px rgba(15,23,42,0.18)",
        glow: "0 0 0 1px rgba(14,165,164,0.18), 0 12px 40px -8px rgba(14,165,164,0.35)",
        "glow-promo": "0 0 0 1px rgba(245,158,11,0.25), 0 12px 40px -8px rgba(245,158,11,0.35)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0ea5a4 0%, #0f766e 45%, #155e75 100%)",
        "hero-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(94,234,212,0.25), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        blob: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-30px) scale(1.1)" },
          "66%": { transform: "translate(-20px,20px) scale(0.95)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.8s ease both",
        float: "float 6s ease-in-out infinite",
        blob: "blob 14s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
