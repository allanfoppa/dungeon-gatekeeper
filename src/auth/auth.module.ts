import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../features/users/users.module';
import { RolesGuard } from './guards/roles.guard';
import { LevelGuard } from './guards/level.guard';
import { AncientKeyGuard } from './guards/ancient-key.guard';
import { GateThrottlerGuard } from './guards/gate-throttler.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'the-ancient-runes-are-not-this-obvious-in-prod',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
    }),
    // Provides rate limiting for /auth/enter-gate — 5 attempts per minute per IP.
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60_000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, LevelGuard, AncientKeyGuard, GateThrottlerGuard],
  exports: [AuthService, RolesGuard, LevelGuard, AncientKeyGuard],
})
export class AuthModule {}