/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:        "#1a6b3c",
        "primary-light":"#2d8a54",
        secondary:      "#f5a623",
        "secondary-light":"#f7b84b",
        accent:         "#e63946",
        surface:        "#fdfaf5",
      },
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
      boxShadow: {
        card:   "0 2px 16px rgba(0,0,0,0.06)",
        soft:   "0 2px 8px rgba(0,0,0,0.08)",
        modal:  "0 8px 40px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
};
