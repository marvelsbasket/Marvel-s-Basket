import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleType } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no permissions are required on route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['products:create', 'products:update']);
    const context = createMockContext({
      permissions: ['products:create', 'products:update', 'orders:read'],
      roles: [UserRoleType.SELLER],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should grant access to SUPER_ADMIN regardless of specific permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['super:exclusive:perm']);
    const context = createMockContext({
      permissions: [],
      roles: [UserRoleType.SUPER_ADMIN],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject access if user lacks one of the required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['products:create', 'products:delete']);
    const context = createMockContext({
      permissions: ['products:create'],
      roles: [UserRoleType.SELLER],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject access if user is null or missing permissions array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['products:read']);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
