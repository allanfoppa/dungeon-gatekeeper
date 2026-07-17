export type GuildRole = 'adventurer' | 'officer' | 'guildmaster';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: GuildRole;
  characterLevel: number;
  hasAncientKey: boolean; // UNLOCKED VIA STEP-UP AUTH
}
