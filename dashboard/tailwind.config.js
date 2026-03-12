/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0A1A28',
          blue: '#0057A8',
          'blue-dark': '#004080',
          'blue-light': '#E8F1FA',
          'blue-hover': '#0068C8',
          accent: '#B8FF00',
          'accent-hover': '#9FDB00',
          'accent-dark': '#4D7C0F',
          muted: '#64748B',
          // Sidebar dark surfaces
          'sidebar': '#0A1A28',
          'sidebar-hover': '#0F2035',
          'sidebar-border': '#1A3048',
        },
        sentiment: {
          positive: '#22C55E',
          neutral: '#6B7280',
          negative: '#EF4444',
        },
        // Studio dark theme surfaces (Material elevation model)
        studio: {
          base: '#0D0D0D',
          bg: '#121212',
          'surface-0': '#151515',
          'surface-1': '#1A1A1A',
          'surface-2': '#1F1F1F',
          'surface-3': '#242424',
          'surface-4': '#2A2A2A',
          'surface-5': '#303030',
          'surface-6': '#383838',
          border: '#2A2A2A',
          'border-subtle': '#1F1F1F',
          'border-hover': '#404040',
          'text-primary': '#E8E8E8',
          'text-secondary': '#A0A0A0',
          'text-tertiary': '#6B6B6B',
          'text-disabled': '#4A4A4A',
          'ai-purple': '#8B5CF6',
          'ai-start': '#7C3AED',
          'ai-end': '#3B82F6',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        headline: ["'Tektur'", 'sans-serif'],
        body: ["'Inter'", 'sans-serif'],
        stats: ["'Tektur'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        'glass': '0 1px 8px rgba(0,0,0,0.06)',
        'studio-canvas': '0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        'studio-glow': '0 0 16px rgba(184,255,0,0.2)',
        'studio-panel': '0 0 0 1px rgba(255,255,255,0.04)',
        'studio-dropdown': '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'studio-pulse': 'studioPulse 2s ease-in-out infinite',
        'studio-spin': 'spin 1s linear infinite',
      },
      keyframes: {
        studioPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
