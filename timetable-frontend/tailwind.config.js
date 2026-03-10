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
          50: '#fdf2f6',
          100: '#fce7ef',
          200: '#f9d0df',
          300: '#f4aabf',
          400: '#ec7595',
          500: '#e0446f',
          600: '#A4123F',
          700: '#850e32',
          800: '#6f0f2e',
          900: '#5d1229',
        },
      },
    },
  },
  plugins: [],
}