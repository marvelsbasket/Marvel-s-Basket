import { cn } from './cn';
import { colors, radii, shadows } from '../../styles/tokens';

describe('Utility & Design Token Assertions', () => {
  describe('cn (clsx + twMerge)', () => {
    it('merges multiple conditional classes and resolves tailwind conflicts', () => {
      const isActive = true;
      const isHidden = false;
      const result = cn('bg-red-500', isActive && 'p-4', isHidden && 'hidden', 'bg-forest');
      // twMerge should ensure bg-forest overrides bg-red-500
      expect(result).toBe('p-4 bg-forest');
    });

    it('handles undefined and null inputs gracefully', () => {
      expect(cn('base-class', undefined, null)).toBe('base-class');
    });
  });

  describe('Design Tokens Integrity', () => {
    it('defines primary brand colors matching design requirements', () => {
      expect(colors.forest).toBe('#0B5D2A');
      expect(colors.brand.DEFAULT).toBe('#15803D');
      expect(colors.brand.leaf).toBe('#22A047');
      expect(colors.cta.DEFAULT).toBe('#F4E022');
      expect(colors.highlight.DEFAULT).toBe('#D4E137');
    });

    it('defines specific border radius and shadow tokens', () => {
      expect(radii.banner).toBe('16px');
      expect(radii.card).toBe('12px');
      expect(radii.tile).toBe('14px');
      expect(radii.full).toBe('9999px');
      expect(shadows.card).toContain('rgba(17, 24, 39');
    });
  });
});
