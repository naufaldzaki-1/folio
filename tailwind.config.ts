import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: {
    primary: "#8B5CF6", deep: "#6D28D9", lavender: "#F5F3FF", white: "#FFFFFF",
    blue: "#DBEAFE", mint: "#D1FAE5", yellow: "#FEF3C7", pink: "#FCE7F3",
    background: "#FAFAFC", text: "#18181B", secondary: "#71717A", border: "#E4E4E7"
  }}},
  plugins: [require("@tailwindcss/forms")]
};
export default config;