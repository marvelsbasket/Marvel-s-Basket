import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../../../common/constants';

/**
 * Decorator to enforce Permission-Based Access Control on controller endpoints or classes.
 * Example: @Permissions('products:create', 'products:update')
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
