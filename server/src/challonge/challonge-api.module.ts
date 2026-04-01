import { Module } from '@nestjs/common';
import { ChallongeApiService } from './challonge-api.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ChallongeApiService],
  exports: [ChallongeApiService],
})
export class ChallongeApiModule {}