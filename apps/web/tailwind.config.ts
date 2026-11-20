import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: '#0B5D2A',
        brand: {
          DEFAULT: '#15803D',
          dark: '#0B5D2A',
          leaf: '#22A047',
          lime: '#84CC16',
          light: '#E8F5E9',
        },
        cta: {
          DEFAULT: '#F4E022',
          hover: '#E5D118',
        },
        highlight: {
          DEFAULT: '#D4E137',
          dark: '#14361D',
        },
        rating: '#F59E0B',
        surface: {
          DEFAULT: '#F3F4F6',
          tile: '#F4F6F8',
          subtle: '#F9FAFB',
        },
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#E2E8F0',
          card: '#F1F5F9',
        },
        ink: {
          DEFAULT: '#111827',
          secondary: '#374151',
          muted: '#6B7280',
          micro: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        tile: '14px',
        banner: '16px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(17, 24, 39, 0.06)',
        'card-hover': '0 8px 24px rgba(17, 24, 39, 0.12)',
        cta: '0 4px 12px rgba(0, 0, 0, 0.15)',
        dropdown: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
