/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9cfd7',
          300: '#f3a8b6',
          400: '#e9738a',
          500: '#da4364',
          600: '#A4123F',
          700: '#8b0e35',
          800: '#750f30',
          900: '#62112b',
        },
      },
    },
  },
  plugins: [],
}