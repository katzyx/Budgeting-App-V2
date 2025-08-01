/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'pink-marshmallow': '#f4b8d4',
        'delicate-blue': '#a8c8ec',
        'veiled-vista': '#c7e2c8',
        'custom-yellow': '#f1f0b0'
      }
    },
  },
  plugins: [],
}