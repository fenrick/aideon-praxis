import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
} satisfies Config;

export default config;

