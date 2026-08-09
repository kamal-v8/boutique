import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#E4E2DD',
        ink: '#1E1E1E',
        accent: '#DB4A2B',
        ember: '#F8A348',
        blush: '#FF89A9',
        panel: '#D9D6D0',
      },
      fontFamily: {
        display: ['"Clash Display"', 'var(--font-display-fallback)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'var(--font-body-fallback)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blob-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'translate(0,0) scale(1)' },
          '50%': { opacity: '0.9', transform: 'translate(3vw,-3vw) scale(1.05)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.8s cubic-bezier(0.16,1,0.3,1) both',
        'blob-pulse': 'blob-pulse 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
