import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chassis (Fog-beige plastic) — allowed ONLY on the outer chassis.
        chassis: {
          hi: "#e4dccb",
          base: "#d3c9b4",
          mid: "#c4b9a2",
          lo: "#a89c84",
          deep: "#8a7f68",
          page: "#3b3730",
        },
        // The screen is 1-bit. Only these two values live inside the CRT.
        crt: {
          black: "#000000",
          white: "#ffffff",
        },
      },
      fontFamily: {
        // Silkscreen — the Chicago proxy. Chrome only.
        chrome: ['var(--font-silkscreen)', "monospace"],
        // Geneva stack — prose only.
        prose: ["Geneva", "Verdana", "DejaVu Sans", "sans-serif"],
      },
      boxShadow: {
        chassis:
          "inset 0 1px 0 #f3ecdd, inset 0 -2px 3px #a89c84, 0 12px 28px rgba(0,0,0,.45)",
        // Hard, no-blur Mac window shadow.
        mac: "2px 2px 0 #000",
      },
      borderRadius: {
        chassis: "14px",
        recess: "8px",
        btn: "7px",
      },
    },
  },
  plugins: [],
};
export default config;
