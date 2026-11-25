export type ProductImageVariant = 'thumb' | 'card' | 'detail';

const WIDTH_BY_VARIANT: Record<ProductImageVariant, number> = {
  thumb: 160,
  card: 400,
  detail: 800,
};

/**
 * Generates responsive image URLs using Cloudinary transforms (`f_auto,q_auto,w_*`)
 * when an image is hosted on Cloudinary, or tunes Unsplash width cleanly.
 */
export function getOptimizedProductImage(
  url?: string | null,
  variant: ProductImageVariant = 'card',
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const targetWidth = WIDTH_BY_VARIANT[variant];

  // Cloudinary transformation injection: /image/upload/ -> /image/upload/f_auto,q_auto,w_<width>/
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    const [prefix, rest] = trimmed.split('/image/upload/');
    if (!rest) return trimmed;
    const parts = rest.split('/');
    const hasTransform =
      parts[0] && (parts[0].includes(',') || /^[a-z]_[a-z0-9]+$/i.test(parts[0]));
    const cleanRest = hasTransform ? parts.slice(1).join('/') : rest;
    return `${prefix}/image/upload/f_auto,q_auto,w_${targetWidth}/${cleanRest}`;
  }

  // Unsplash CDN width tuning
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('q', '80');
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}
