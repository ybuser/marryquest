import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular']
      },
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          accent: '#22d3ee'
        }
      }
    }
  },
  plugins: []
};

export default config;
