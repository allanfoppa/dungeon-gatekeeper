import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { DungeonModule } from './features/dungeon/dungeon.module';
import { GuildModule } from './features/guild/guild.module';

@Module({
  imports: [AuthModule, UsersModule, DungeonModule, GuildModule],
})
export class AppModule {}
