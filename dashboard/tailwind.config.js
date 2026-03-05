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
          accent: '#BD9A57',
          'accent-hover': '#D4AF6A',
          muted: '#7298BE',
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
