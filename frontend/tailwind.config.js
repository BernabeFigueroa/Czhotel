/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'senior-title': '2rem',
        'senior-body': '1.25rem',
      }
    },
  },
  plugins: [],
}
