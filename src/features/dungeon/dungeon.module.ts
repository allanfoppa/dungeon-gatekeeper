import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DungeonController } from './dungeon.controller';

@Module({
  imports: [AuthModule],
  controllers: [DungeonController],
})
export class DungeonModule {}
