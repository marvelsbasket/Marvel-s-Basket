import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { ROLES_KEY } from '../../../common/constants';

/**
 * Decorator to enforce Role-Based Access Control on controller endpoints or classes.
 * Example: @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
 */
export const Roles = (...roles: (UserRoleType | string)[]) => SetMetadata(ROLES_KEY, roles);
