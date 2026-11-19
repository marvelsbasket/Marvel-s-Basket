import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Parameter decorator to extract the currently authenticated user from the request.
 * Example:
 *   @Get('me')
 *   getProfile(@CurrentUser() user: AuthUser) { ... }
 *   @Get('id')
 *   getUserId(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
