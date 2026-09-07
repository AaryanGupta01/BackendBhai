/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          base: '#FDFBF7',
          border: '#EFEBE4',
          text: '#2D241B',
          muted: '#8C8276',
          accent: '#5C4033',
          error: '#C05640',
          success: '#5A7D59'
        }
      },
      keyframes: {
        flow: {
          'to': { 'stroke-dashoffset': '-150' },
        }
      },
      animation: {
        flow: 'flow 2s linear infinite',
      }
    },
  },
  plugins: [],
}