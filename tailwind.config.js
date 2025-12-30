/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(0 0% 90%)',
        brand: {
          DEFAULT: '#8b5cf6',
          accent: '#22d3ee'
        }
      }
    }
  },
  plugins: []
};
