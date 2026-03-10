import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./apps/frontend/src/**/*.{ts,tsx}', './apps/frontend/index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        surface: {
          base: 'var(--bg-base)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
        },

        // Backward-compatible aliases for existing components.
        'bg-primary': 'var(--bg-base)',
        'bg-card': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'accent-gold': '#c89b3c',
        'accent-blue': 'var(--accent-primary)',
        'accent-red': '#ef5350',
        'accent-green': '#66bb6a',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border-default)',
        tier: {
          S: '#c89b3c',
          A: 'var(--accent-primary)',
          B: '#66bb6a',
          C: '#9e9e9e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.4)',
        glow: '0 0 16px rgba(200,155,60,0.25)',
        'glow-blue': '0 0 16px rgba(79,195,247,0.25)',
      },
      borderRadius: {
        card: '0.75rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
