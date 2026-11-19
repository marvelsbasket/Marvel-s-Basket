import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleType } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
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

  it('should allow access if no roles are required on route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ roles: [UserRoleType.CUSTOMER] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleType.ADMIN]);
    const context = createMockContext({ roles: [UserRoleType.ADMIN] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should grant access to SUPER_ADMIN regardless of required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleType.SELLER]);
    const context = createMockContext({ roles: [UserRoleType.SUPER_ADMIN] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject access if user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleType.ADMIN]);
    const context = createMockContext({ roles: [UserRoleType.CUSTOMER] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject access if user is not authenticated or has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleType.CUSTOMER]);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
