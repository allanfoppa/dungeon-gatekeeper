import { SetMetadata } from '@nestjs/common';
import { GuildRole } from '../../features/users/user.entity';

export const ROLES_KEY = 'roles';
/** Guards the "Guild Hall" — only these ranks may enter. */
export const Roles = (...roles: GuildRole[]) => SetMetadata(ROLES_KEY, roles);
