/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2F9',
          100: '#D6E0F0',
          200: '#AEC1E1',
          600: '#1E3A8A',
          700: '#172E6E',
          800: '#0F2557',
          900: '#09183B',
          950: '#050E24',
        },
        royal: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
          800: '#4C1D95',
          900: '#3B0764',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        ivory: {
          50: '#FFFDF9',
          100: '#FAF8F3',
          200: '#F3EFE4',
          300: '#E7E0CE',
        },
      },
      fontFamily: {
        sans: ['"Prompt"', '"Kanit"', 'sans-serif'],
        display: ['"Kanit"', '"Prompt"', 'sans-serif'],
        sarabun: ['"Sarabun"', 'sans-serif'],
      },
      boxShadow: {
        academic: '0 8px 30px -6px rgba(15, 37, 87, 0.12)',
        gold: '0 6px 20px -4px rgba(217, 119, 6, 0.25)',
      },
    },
  },
  plugins: [],
};
