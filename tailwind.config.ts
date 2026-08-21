import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        muted: "#6b7772",
        paper: "#f5f4ef",
        cream: "#fffdf8",
        line: "#dfe2da",
        lime: "#d5f25f",
        coral: "#ff765f",
        teal: "#0e6b62",
      },
      boxShadow: {
        relay: "0 20px 50px rgba(23, 33, 31, 0.1)",
      },
      fontFamily: {
        manrope: ["Manrope", "sans-serif"],
        dmmono: ["DM Mono", "monospace"],
      },
      keyframes: {
        drift: {
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        drift: "drift 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
