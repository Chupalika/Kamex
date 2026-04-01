import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Score, ScoreSchema } from 'src/schemas/score.schema';
import { Scoresheet, ScoresheetSchema } from 'src/schemas/scoresheet.schema';
import { ScoresheetController } from 'src/scoresheet/scoresheet.controller';
import { ScoresheetService } from 'src/scoresheet/scoresheet.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Score.name, schema: ScoreSchema },
      { name: Scoresheet.name, schema: ScoresheetSchema },
    ]),
  ],
  controllers: [ScoresheetController],
  providers: [ScoresheetService],
})
export class ScoresheetModule {}