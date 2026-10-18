import type { Config } from 'tailwindcss';

const config: Config = {
  // Dark mode driven by a `dark` class on <html> — controlled by ThemeProvider
  darkMode: 'class',

  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      // ─── Brand Colour Palette ────────────────────────────────────
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4beff',
          400: '#7a9bfc',
          500: '#5271f5',  // Primary brand colour
          600: '#3b4ef0',
          700: '#2f3de3',
          800: '#2731bb',
          900: '#252e94',
          950: '#181e5a',
        },
        surface: {
          DEFAULT: '#0f0f13',
          raised: '#18181f',
          overlay: '#22222c',
          border: '#2e2e3d',
        },
      },

      // ─── Typography ──────────────────────────────────────────────
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },

      // ─── Animations ──────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 1.8s linear infinite',
      },

      // ─── Glassmorphism Utilities ─────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },
    },
  },

  plugins: [],
};

export default config;
