import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleType } from '@prisma/client';
import { ROLES_KEY } from '../../../common/constants';
import { AuthUser } from '../interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(UserRoleType | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user || !user.roles || user.roles.length === 0) {
      throw new ForbiddenException('Access denied: Insufficient role permissions');
    }

    // SUPER_ADMIN has platform-wide superuser privileges
    if (user.roles.includes(UserRoleType.SUPER_ADMIN)) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'Access denied: You do not possess the required role for this resource',
      );
    }

    return true;
  }
}
