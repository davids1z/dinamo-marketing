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
        headline: ["'Tektur'", 'sans-serif'],
        body: ["'Inter'", 'sans-serif'],
        stats: ["'Tektur'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        'glass': '0 1px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
