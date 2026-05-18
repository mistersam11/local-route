import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#eff8ef",
          100: "#d9edd8",
          500: "#2f7d4d",
          700: "#205c3a",
          900: "#143725"
        },
        clay: {
          100: "#f5e7d8",
          300: "#d7a06b",
          500: "#a85d31",
          700: "#713c22"
        },
        water: {
          100: "#d9f2ef",
          500: "#1f9d92",
          700: "#126b68"
        },
        ink: "#17211c"
      },
      boxShadow: {
        panel: "0 18px 55px rgba(23, 33, 28, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
