import { SetMetadata } from '@nestjs/common';
import { BYPASS_TRANSFORM_KEY } from '../constants';

/**
 * Decorator to bypass standard API response transformation (e.g. for streams, downloads, Swagger).
 */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
