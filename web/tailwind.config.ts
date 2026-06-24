import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        eclipse: {
          bg: "#0a0a0f",
          surface: "#13131a",
          border: "#1e1e2e",
          accent: "#7c3aed",
          "accent-dim": "#4c1d95",
          muted: "#6b7280",
          text: "#e2e8f0",
          danger: "#ef4444",
          success: "#22c55e",
          warning: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
