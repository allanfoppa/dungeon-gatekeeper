import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ANCIENT_KEY = 'requireAncientKey';
/**
 * Marks a route as needing "step-up" verification — the base JWT
 * proves who you are, but sensitive rooms also need the ancientKey
 * claim, only granted after a second proof-of-possession step.
 */
export const RequireAncientKey = () => SetMetadata(REQUIRE_ANCIENT_KEY, true);
