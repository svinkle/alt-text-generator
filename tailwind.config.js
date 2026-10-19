/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF8F1",
        ink: "#1E1B18",
        violet: {
          DEFAULT: "#7C3AED",
          600: "#7C3AED",
          700: "#6D28D9",
          100: "#EDE9FE",
        },
        mint: {
          DEFAULT: "#10B981",
          500: "#10B981",
          100: "#D1FAE5",
        },
        amber: {
          DEFAULT: "#F59E0B",
          500: "#F59E0B",
          100: "#FEF3C7",
        },
        dark: {
          border: "#6E6E6E",
          light: "#2D2D2D",
          "medium-1": "#1C1C1C",
          "medium-2": "#161616",
          dark: "#101010",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #1E1B18",
        "brutal-sm": "2px 2px 0px 0px #1E1B18",
        "brutal-lg": "6px 6px 0px 0px #1E1B18",
        "brutal-xl": "8px 8px 0px 0px #1E1B18",
        "brutal-violet": "4px 4px 0px 0px #7C3AED",
        "brutal-mint": "4px 4px 0px 0px #10B981",
      },
    },
  },
  plugins: [],
}
