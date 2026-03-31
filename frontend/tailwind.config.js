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
          DEFAULT: '#2749F5',
          50: '#EEF1FE',
          100: '#DCE4FD',
          200: '#B9C9FB',
          300: '#96AEF9',
          400: '#7393F7',
          500: '#2749F5',
          600: '#0A2CD4',
          700: '#08229F',
          800: '#05176A',
          900: '#030C35',
        },
      },
    },
  },
  plugins: [],
}
