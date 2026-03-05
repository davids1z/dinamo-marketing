/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dinamo: {
          primary: '#0A1A28',
          'primary-light': '#112233',
          dark: '#0A1A28',
          'dark-light': '#112233',
          'dark-card': '#112233',
          accent: '#B8FF00',
          'accent-hover': '#9FDB00',
          'accent-dark': '#4D7C0F',
          muted: '#64748B',
          'muted-light': '#7298BE',
          blue: '#0057A8',
        },
        sentiment: {
          positive: '#22C55E',
          neutral: '#6B7280',
          negative: '#EF4444',
        },
      },
      fontFamily: {
        headline: ["'Montserrat'", 'sans-serif'],
        body: ["'Montserrat'", 'sans-serif'],
        stats: ["'Montserrat'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
}
