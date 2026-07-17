import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../features/users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private buildPayload(userId: string): JwtPayload {
    const user = this.users.findById(userId)!;
    return {
      sub: user.id,
      username: user.username,
      role: user.role,
      characterLevel: user.characterLevel,
      hasAncientKey: user.hasAncientKey,
    };
  }

  private issueTokens(userId: string) {
    const payload = this.buildPayload(userId);
    const accessToken = this.jwt.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    });
    const refreshTokenId = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, jti: refreshTokenId },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' },
    );
    return { accessToken, refreshToken };
  }

  async register(username: string, password: string) {
    if (this.users.findByUsername(username)) {
      throw new ConflictException('That name is already on the guild roster.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.users.create(username, passwordHash);
    return this.issueTokens(user.id);
  }

  async login(username: string, password: string) {
    const user = this.users.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Wrong name or password. The gate does not recognize you.');
    }
    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string) {
    let decoded: { sub: string; jti: string };
    try {
      decoded = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Your membership card has expired or is forged.');
    }
    if (this.users.banishedTokenIds.has(decoded.jti)) {
      throw new ForbiddenException('This membership card was torn up. You have been banished.');
    }
    if (!this.users.findById(decoded.sub)) {
      throw new UnauthorizedException('No such adventurer on the roster anymore.');
    }
    return this.issueTokens(decoded.sub);
  }

  levelUp(userId: string) {
    const user = this.users.levelUp(userId);
    if (!user) throw new UnauthorizedException();
    // Re-issue tokens so the new characterLevel claim actually takes effect —
    // this is the classic "why are JWTs short-lived" lesson in action.
    return this.issueTokens(user.id);
  }

  proveKey(userId: string) {
    // Pretend this is a real second factor (TOTP, magic item check, etc).
    const user = this.users.grantAncientKey(userId);
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user.id);
  }

  promote(userId: string, role: 'adventurer' | 'officer' | 'guildmaster') {
    const user = this.users.promote(userId, role);
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user.id);
  }

  banish(refreshTokenJti: string) {
    this.users.banishedTokenIds.add(refreshTokenJti);
  }
}
