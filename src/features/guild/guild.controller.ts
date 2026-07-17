import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthService } from '../../auth/auth.service';

interface AuthLogEntry {
  at: string;
  event: string;
}

@Controller('guild-hall')
export class GuildController {
  // A tiny in-memory audit trail — swap for real logging/monitoring later.
  private readonly logs: AuthLogEntry[] = [];

  constructor(private readonly auth: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('officer', 'guildmaster')
  @Get()
  hall(@Req() req: any) {
    this.logs.push({ at: new Date().toISOString(), event: `${req.user.username} entered the hall` });
    return { message: 'You are recognized as an officer of the guild. Welcome inside.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guildmaster')
  @Get('logs')
  viewLogs() {
    // Audit trail — guildmaster only.
    return { logs: this.logs };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guildmaster')
  @Post('promote')
  promote(@Body('userId') userId: string, @Body('role') role: 'adventurer' | 'officer' | 'guildmaster') {
    return this.auth.promote(userId, role);
  }
}
