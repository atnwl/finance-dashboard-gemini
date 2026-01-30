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
        primary: '#3ECF8E', // Supabase emerald green
        secondary: '#3B82F6', // Blue accent for some elements
        text: '#E5E7EB',
        muted: '#9CA3AF',
        border: '#1F2937',
      }
    },
  },
  plugins: [],
}
