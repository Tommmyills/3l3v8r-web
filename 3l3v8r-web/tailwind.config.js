/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 3L3V8R Theme Colors
        'te-bg': '#0E0E0E',
        'te-panel': '#0a0a0a',
        'te-border': '#2a2a2a',
        'te-text': '#FFFFFF',
        'te-text-secondary': '#999999',
        'te-text-tertiary': '#666666',
        // Mode Colors
        'te-focus': '#FF7A00',
        'te-study': '#00E3FF',
        'te-chill': '#8B5CF6',
        'te-flow': '#14B8A6',
        'te-deep': '#EF4444',
        // Platform Colors
        'bandcamp': '#1DA0C3',
        'mixcloud': '#FF7F00',
        'apple-music': '#FC3C44',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        'te-wide': '0.15em',
        'te-wider': '0.2em',
      },
      animation: {
        'pulse-glow': 'pulse-glow 10s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
}
