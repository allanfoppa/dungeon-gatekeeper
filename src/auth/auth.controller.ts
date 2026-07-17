import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GateThrottlerGuard } from './guards/gate-throttler.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('join-guild')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.username, dto.password);
  }

  // Only 5 login attempts per minute per IP — hinders brute force password attacks at the gate.
  // Registration and other routes are unaffected.
  @UseGuards(GateThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60_000 } })
  @Post('enter-gate')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('level-up')
  levelUp(@Req() req: any) {
    return this.auth.levelUp(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('prove-key')
  proveKey(@Req() req: any) {
    // In production: verify TOTP code, signed challenge, biometrics, etc.
    return this.auth.proveKey(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('banish')
  banish(@Body('refreshTokenJti') jti: string) {
    this.auth.banish(jti);
    return { message: 'The offender has been struck from the roster and their card torn up.' };
  }
}