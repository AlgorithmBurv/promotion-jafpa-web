/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A', /* Dark Blue */
        accent: '#FFD54F',  /* Yellow */
        light: '#F3F4F6'    /* Light Gray */
      }
    },
  },
  plugins: [],
}