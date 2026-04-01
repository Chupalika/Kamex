import { Module } from '@nestjs/common';
import { OsuApiService } from './osu-api.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [OsuApiService],
  exports: [OsuApiService],
})
export class OsuApiModule {}