/**
 * Marvel's Basket — Centralized Design Tokens
 * Derived from the official brand identity and website UI reference design.
 */

export const colors = {
  // Brand & Greens
  forest: '#0B5D2A', // Deep Forest Green (Hero start & brand text)
  brand: {
    DEFAULT: '#15803D', // Emerald Green (Primary brand identity)
    dark: '#0B5D2A',
    leaf: '#22A047', // Fresh Leaf Green (Wave accent & icons)
    lime: '#84CC16', // Vibrant Lime
    light: '#E8F5E9',
  },

  // Action & Accents
  cta: {
    DEFAULT: '#F4E022', // Citrus Yellow (Primary CTA button)
    hover: '#E5D118',
    text: '#111827',
  },
  highlight: {
    DEFAULT: '#D4E137', // Lime Chartreuse (Trust badges)
    text: '#14361D',
  },
  rating: '#F59E0B', // Amber 500 for rating stars

  // Neutrals & Surfaces
  white: '#FFFFFF',
  surface: {
    DEFAULT: '#F3F4F6', // Soft Cool Gray
    tile: '#F4F6F8', // Category Tile background
    subtle: '#F9FAFB',
  },
  border: {
    DEFAULT: '#E5E7EB',
    subtle: '#E2E8F0',
    card: '#F1F5F9',
  },
  ink: {
    DEFAULT: '#111827', // Primary Charcoal / Heading
    secondary: '#374151', // Secondary Slate
    muted: '#6B7280', // Muted Gray
    micro: '#9CA3AF',
  },

  // Feedback states
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const radii = {
  none: '0px',
  sm: '4px',
  md: '8px',
  card: '12px', // Seller card radius
  tile: '14px', // Category icon tile radius
  banner: '16px', // Hero banner radius
  full: '9999px', // Search bar, CTA pills, badges
} as const;

export const shadows = {
  card: '0 2px 8px rgba(17, 24, 39, 0.06)',
  cardHover: '0 8px 24px rgba(17, 24, 39, 0.12)',
  cta: '0 4px 12px rgba(0, 0, 0, 0.15)',
  dropdown: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
