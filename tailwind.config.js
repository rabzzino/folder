/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A', // Nearly black
        surface: '#1A1A1A', // Dark gray
        surfaceHighlight: '#2A2A2A',
        primary: '#D4AF37', // Metallic Gold
        primaryLight: '#E5C158',
        secondary: '#C0C0C0', // Silver
        text: '#FFFFFF',
        textMuted: '#A1A1A1',
        card: '#121212',
        border: '#333333'
      },
    },
  },
  plugins: [],
}
