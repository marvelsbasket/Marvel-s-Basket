import { BadRequestException } from '@nestjs/common';

const UNSAFE_PATTERN = /<\s*script|javascript:|on\w+\s*=|<[^>]+>/i;

/**
 * Rejects HTML tags, script tags, and inline event handlers in user-generated review text.
 */
export function sanitizeAndValidateReviewText(
  value: string,
  fieldName: string,
  minLength = 1,
): string {
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new BadRequestException({
      code: 'INVALID_REVIEW_TEXT',
      message: `${fieldName} must be at least ${minLength} characters.`,
    });
  }
  if (UNSAFE_PATTERN.test(trimmed)) {
    throw new BadRequestException({
      code: 'UNSAFE_REVIEW_CONTENT',
      message: `${fieldName} contains disallowed HTML or script content.`,
    });
  }
  return trimmed;
}
