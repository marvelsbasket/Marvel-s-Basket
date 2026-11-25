import { getOptimizedProductImage } from './cloudinary';

describe('Cloudinary & responsive product image helper', () => {
  it('injects f_auto,q_auto,w_400 on Cloudinary card URLs', () => {
    const src = 'https://res.cloudinary.com/demo/image/upload/v1700000000/marvels/milk.jpg';
    expect(getOptimizedProductImage(src, 'card')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1700000000/marvels/milk.jpg',
    );
    expect(getOptimizedProductImage(src, 'detail')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1700000000/marvels/milk.jpg',
    );
    expect(getOptimizedProductImage(src, 'thumb')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160/v1700000000/marvels/milk.jpg',
    );
  });

  it('replaces existing Cloudinary transforms cleanly', () => {
    const src = 'https://res.cloudinary.com/demo/image/upload/w_200,c_fill/marvels/atta.jpg';
    expect(getOptimizedProductImage(src, 'card')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/marvels/atta.jpg',
    );
  });

  it('tunes Unsplash CDN width and handles empty/null URLs', () => {
    expect(getOptimizedProductImage(null, 'card')).toBeNull();
    expect(getOptimizedProductImage('', 'card')).toBeNull();
    const unsplash = 'https://images.unsplash.com/photo-1550583724?w=600&q=80';
    const optimized = getOptimizedProductImage(unsplash, 'detail');
    expect(optimized).toContain('w=800');
  });
});
