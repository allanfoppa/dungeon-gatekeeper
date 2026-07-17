import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LevelGuard } from '../../auth/guards/level.guard';
import { AncientKeyGuard } from '../../auth/guards/ancient-key.guard';
import { RequiredLevel } from '../../auth/decorators/required-level.decorator';
import { RequireAncientKey } from '../../auth/decorators/require-ancient-key.decorator';

@Controller()
export class DungeonController {
  @Get('tavern')
  tavern() {
    // Public. No auth needed. Come as you are.
    return { message: 'You push open the tavern door. Nobody checks your credentials here.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('training-grounds')
  trainingGrounds() {
    // Any valid JWT — bare authentication, no authorization on top.
    return { message: 'You spar with a training dummy. Adequate.' };
  }

  @UseGuards(JwtAuthGuard, LevelGuard)
  @RequiredLevel(3)
  @Get('dungeon/:level')
  dungeon(@Param('level', ParseIntPipe) level: number) {
    // Claims-based check: your characterLevel (a JWT claim) vs a fixed threshold.
    return { message: `You descend into dungeon floor ${level}. Something growls in the dark.` };
  }

  @UseGuards(JwtAuthGuard, AncientKeyGuard)
  @RequireAncientKey()
  @Get('forbidden-archive')
  archive() {
    // Step-up auth: base JWT proves identity, but this room needs the extra claim.
    return { message: 'The archive door groans open. Forbidden knowledge awaits.' };
  }
}
