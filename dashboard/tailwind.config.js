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
          primary: '#0057A8',
          'primary-light': '#1a6fbf',
          'primary-dark': '#004080',
          dark: '#0A0E1A',
          'dark-light': '#141927',
          'dark-card': '#1a1f33',
          accent: '#00A8E8',
          'accent-hover': '#0090c8',
        },
        sentiment: {
          positive: '#22C55E',
          neutral: '#6B7280',
          negative: '#EF4444',
        },
      },
      fontFamily: {
        headline: ["'Bebas Neue'", 'sans-serif'],
        body: ["'Barlow Condensed'", 'sans-serif'],
        stats: ["'Oswald'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
}
