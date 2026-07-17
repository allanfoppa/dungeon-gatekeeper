import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { GuildController } from './guild.controller';

@Module({
  imports: [AuthModule],
  controllers: [GuildController],
})
export class GuildModule {}
