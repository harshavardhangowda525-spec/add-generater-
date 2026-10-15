import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A2540", 700: "#0F2F52", 600: "#163B63" },
        brand: { DEFAULT: "#2563EB", 600: "#1D4ED8", 50: "#EFF6FF" },
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
