import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
  characterLevel: number;
  hasAncientKey: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'the-ancient-runes-are-not-this-obvious-in-prod',
    });
  }

  // Whatever we return here becomes req.user — this is our "claims bundle".
  async validate(payload: JwtPayload) {
    return payload;
  }
}
