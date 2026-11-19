import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * Decorator to mark routes as publicly accessible, bypassing global authentication guards.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
