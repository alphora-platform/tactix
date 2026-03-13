import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./apps/frontend/src/**/*.{ts,tsx}', './apps/frontend/index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#8b5cf6',
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
        'accent-gold': 'var(--accent-gold)',
        'accent-blue': 'var(--accent-primary)',
        'accent-red': '#ef5350',
        'accent-green': '#10b981',
        'accent-cyan': 'var(--accent-cyan)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border-default)',
        tier: {
          S: '#f59e0b',
          A: '#8b5cf6',
          B: '#10b981',
          C: '#6b7280',
        },

        // Cosmos theme tokens
        cosmos: {
          base: '#03071a',
          surface: '#070f26',
          elevated: '#0c1635',
          overlay: '#162040',
        },
        electric: {
          blue: '#8b5cf6',
          cyan: '#06b6d4',
        },
        nebula: {
          gold: '#f59e0b',
          purple: '#a855f7',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        russo: ['Russo One', 'system-ui', 'sans-serif'],
        chakra: ['Chakra Petch', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.6)',
        'card-hover': '0 6px 24px rgba(0,0,0,0.7)',
        glow: '0 0 20px rgba(245,158,11,0.35)',
        'glow-blue': '0 0 20px rgba(139,92,246,0.35)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.35)',
        'glow-gold': '0 0 24px rgba(245,158,11,0.45)',
        'glow-tier-s': '0 0 16px rgba(245,158,11,0.55), 0 2px 8px rgba(0,0,0,0.5)',
        'glow-tier-a': '0 0 16px rgba(139,92,246,0.55), 0 2px 8px rgba(0,0,0,0.5)',
        'glow-tier-b': '0 0 16px rgba(16,185,129,0.5), 0 2px 8px rgba(0,0,0,0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      borderRadius: {
        card: '0.75rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
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
        'cosmos-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 6px rgba(139,92,246,0.3)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 18px rgba(139,92,246,0.7)',
            opacity: '0.85',
          },
        },
        'live-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        'cosmos-pulse': 'cosmos-pulse 2.5s ease-in-out infinite',
        'live-blink': 'live-blink 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
