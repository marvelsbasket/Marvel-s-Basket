import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
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
        },
        cta: '#F4E022',
        highlight: '#D4E137',
        rating: '#F59E0B',
        surface: '#F3F4F6',
        border: '#E5E7EB',
        ink: '#111827',
        secondary: '#374151',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
