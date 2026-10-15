import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A2540", 700: "#0F2F52", 600: "#163B63" },
        brand: { DEFAULT: "#2563EB", 600: "#1D4ED8", 400: "#60A5FA", 50: "#EFF6FF" },
        ink: { DEFAULT: "#040B1A", 900: "#061229", 800: "#0B1A36", 700: "#10244A" },
        glow: "#38BDF8",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.25), 0 0 24px -4px rgba(56,189,248,0.35)",
        "glow-strong": "0 0 0 1px rgba(96,165,250,0.6), 0 0 32px -2px rgba(37,99,235,0.7)",
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
} satisfies Config;
