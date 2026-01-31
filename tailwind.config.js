/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors based on the "Paier" image
        background: '#0F1115',
        card: '#161B21',
        primary: '#8DAA7F', // Moss Green (high pigment)
        secondary: '#88A0AF', // Steel Blue
        danger: '#D67C7C', // Terracotta
        warning: '#D4A373', // Mustard / Gold
        text: '#E5E7EB',
        muted: '#9CA3AF',
        border: '#1F2937',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
