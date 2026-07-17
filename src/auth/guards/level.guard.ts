import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_LEVEL_KEY } from '../decorators/required-level.decorator';

@Injectable()
export class LevelGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevel = this.reflector.getAllAndOverride<number>(REQUIRED_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredLevel === undefined) return true;

    const { user } = context.switchToHttp().getRequest();
    if ((user?.characterLevel ?? 0) < requiredLevel) {
      throw new ForbiddenException(
        `You are level ${user?.characterLevel}. This part of the dungeon eats level ${requiredLevel} adventurers for breakfast. Come back stronger.`,
      );
    }
    return true;
  }
}
