/** @type {import('tailwindcss').Config} */
export default {
  content: ['./apps/frontend/src/**/*.{ts,tsx}', './apps/frontend/index.html'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ─────────────────────────────────────────────────────
        'bg-primary': '#0d0f14',
        'bg-card': '#161a23',
        'bg-elevated': '#1e2433',

        // ── Accents ──────────────────────────────────────────────────────────
        'accent-gold': '#c89b3c',
        'accent-blue': '#4fc3f7',
        'accent-red': '#ef5350',
        'accent-green': '#66bb6a',

        // ── Text ─────────────────────────────────────────────────────────────
        'text-primary': '#e0e0e0',
        'text-secondary': '#9e9e9e',

        // ── Borders ───────────────────────────────────────────────────────────
        border: '#2a3040',

        // ── Tier colors ───────────────────────────────────────────────────────
        tier: {
          S: '#c89b3c', // gold
          A: '#4fc3f7', // blue
          B: '#66bb6a', // green
          C: '#9e9e9e', // grey
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
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
