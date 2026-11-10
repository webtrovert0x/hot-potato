import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: "#0b0908",
          surface: "#15110e",
          card: "#1d1712",
          border: "#36271b",
          orange: "#ff6a00",
          amber: "#ff9e00",
          yellow: "#ffd60a",
          ember: "#ff3b00",
        },
      },
      fontFamily: {
        display: [
          "\"Arial Black\"",
          "\"Trebuchet MS\"",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "\"JetBrains Mono\"",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        wobbleHot: {
          "0%, 100%": { transform: "rotate(-4deg) scale(1)" },
          "25%": { transform: "rotate(5deg) scale(1.04)" },
          "50%": { transform: "rotate(-5deg) scale(1.02)" },
          "75%": { transform: "rotate(4deg) scale(1.05)" },
        },
        passBurst: {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "30%": { transform: "scale(1.22) rotate(-14deg) translateY(-14px)" },
          "60%": { transform: "scale(0.92) rotate(12deg) translateY(4px)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "wobble-hot": "wobbleHot 0.65s ease-in-out infinite",
        "pass-burst": "passBurst 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "float-slow": "floatSlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

