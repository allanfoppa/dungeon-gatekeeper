import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ANCIENT_KEY } from '../decorators/require-ancient-key.decorator';

@Injectable()
export class AncientKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_ANCIENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.hasAncientKey) {
      throw new ForbiddenException(
        'The archive door is sealed by ancient magic. Your regular spell of passage is not enough — prove you hold the Ancient Key (POST /auth/prove-key).',
      );
    }
    return true;
  }
}
