import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: { message?: string } | undefined,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || !user) {
      const message =
        info?.message === 'jwt expired'
          ? 'Authentication token has expired'
          : 'Authentication credentials are missing or invalid';
      throw err || new UnauthorizedException(message);
    }
    return user as TUser;
  }
}
