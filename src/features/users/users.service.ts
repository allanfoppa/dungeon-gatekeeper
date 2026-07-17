import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User, GuildRole } from './user.entity';

@Injectable()
export class UsersService {
  // In-memory "guild roster" — swap for a real DB (TypeORM/Prisma) later.
  private readonly roster = new Map<string, User>();
  // Tracks revoked refresh-token IDs (the "banished" list).
  readonly banishedTokenIds = new Set<string>();

  create(username: string, passwordHash: string): User {
    const user: User = {
      id: randomUUID(),
      username,
      passwordHash,
      role: 'adventurer',
      characterLevel: 1,
      hasAncientKey: false,
    };
    this.roster.set(user.id, user);
    return user;
  }

  findByUsername(username: string): User | undefined {
    return [...this.roster.values()].find((u) => u.username === username);
  }

  findById(id: string): User | undefined {
    return this.roster.get(id);
  }

  levelUp(id: string): User | undefined {
    const user = this.roster.get(id);
    if (!user) return undefined;
    user.characterLevel += 1;
    return user;
  }

  promote(id: string, role: GuildRole): User | undefined {
    const user = this.roster.get(id);
    if (!user) return undefined;
    user.role = role;
    return user;
  }

  grantAncientKey(id: string): User | undefined {
    const user = this.roster.get(id);
    if (!user) return undefined;
    user.hasAncientKey = true;
    return user;
  }
}
