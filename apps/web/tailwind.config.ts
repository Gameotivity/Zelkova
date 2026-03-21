import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zelkora: {
          base: "#06080E",
          card: "#0F1629",
          elevated: "#1A2340",
          border: "#1E293B",
          "border-subtle": "#334155",
        },
        accent: {
          primary: "#00E5FF",
          secondary: "#8B5CF6",
        },
        success: "#10B981",
        danger: "#F43F5E",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
