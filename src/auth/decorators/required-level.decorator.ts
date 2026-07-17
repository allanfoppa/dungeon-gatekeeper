import { SetMetadata } from '@nestjs/common';

export const REQUIRED_LEVEL_KEY = 'requiredLevel';
/** Claims-based check — your characterLevel claim must meet or exceed this. */
export const RequiredLevel = (level: number) => SetMetadata(REQUIRED_LEVEL_KEY, level);
