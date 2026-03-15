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
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--brand-accent-hover) / <alpha-value>)',
          'accent-dark': 'rgb(var(--brand-accent-dark) / <alpha-value>)',
          muted: '#64748B',
          // Sidebar dark surfaces
          'sidebar': '#0A1A28',
          'sidebar-hover': '#0F2035',
          'sidebar-border': '#1A3048',
          // Dark CTA button (Dribbble style)
          dark: '#1E293B',
          'dark-hover': '#334155',
        },
        sentiment: {
          positive: '#22C55E',
          neutral: '#6B7280',
          negative: '#EF4444',
        },
        // Studio light theme surfaces
        studio: {
          base: '#F0F7FF',
          bg: '#F5F9FF',
          'surface-0': '#FFFFFF',
          'surface-1': '#FFFFFF',
          'surface-2': '#F1F5F9',
          'surface-3': '#E2E8F0',
          'surface-4': '#CBD5E1',
          'surface-5': '#94A3B8',
          'surface-6': '#64748B',
          border: '#E2E8F0',
          'border-subtle': '#F1F5F9',
          'border-hover': '#CBD5E1',
          'text-primary': '#0F172A',
          'text-secondary': '#475569',
          'text-tertiary': '#94A3B8',
          'text-disabled': '#CBD5E1',
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
        'studio-canvas': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'studio-glow': '0 0 16px rgba(184,255,0,0.2)',
        'studio-panel': '0 1px 2px rgba(0,0,0,0.05)',
        'studio-dropdown': '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
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
