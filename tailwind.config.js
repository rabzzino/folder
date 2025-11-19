/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F5F5F5', // Light gray/off-white
        surface: '#FFFFFF',    // White
        surfaceHighlight: '#F0F0F0',
        primary: '#000000',    // Black
        primaryLight: '#333333',
        secondary: '#E0E0E0',  // Light gray
        text: '#000000',
        textMuted: '#666666',
        card: '#FFFFFF',
        border: '#000000'      // Black borders
      },
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      },
      boxShadow: {
        'block': '4px 4px 0px 0px rgba(0,0,0,1)', // Hard offset shadow
        'block-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}
