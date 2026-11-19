import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleType } from '@prisma/client';
import { PERMISSIONS_KEY } from '../../../common/constants';
import { AuthUser } from '../interfaces';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    // SUPER_ADMIN has platform-wide superuser privileges
    if (user.roles?.includes(UserRoleType.SUPER_ADMIN)) {
      return true;
    }

    const hasAllPermissions = requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Access denied: You do not possess the required permissions for this action',
      );
    }

    return true;
  }
}
