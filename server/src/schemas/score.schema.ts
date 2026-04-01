import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { ScoreMod } from 'src/models/models';

export type ScoreDocument = HydratedDocument<Score>;

@Schema({ timestamps: true })
export class Score {
  @Prop({ required: true })
  playerId: number;

  @Prop({ required: true })
  beatmapId: number;

  @Prop({ required: true, default: 0 })
  timestamp: Date;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, default: [] })
  mods: ScoreMod[];

  @Prop({ required: true, default: 0 })
  accuracy: number;

  @Prop({ required: true, default: 0 })
  countPerfect: number;

  @Prop({ required: true, default: 0 })
  countGreat: number;

  @Prop({ required: true, default: 0 })
  countGood: number;

  @Prop({ required: true, default: 0 })
  countOk: number;

  @Prop({ required: true, default: 0 })
  countMeh: number;

  @Prop({ required: true, default: 0 })
  countMiss: number;

  @Prop({ required: true, default: 0 })
  countLargeTickHit: number;

  @Prop({ required: true, default: 0 })
  countSmallTickHit: number;

  @Prop({ required: true, default: 0 })
  maxCombo: number;

  @Prop({ required: true, default: 0 })
  matchId: number;

  @Prop({ required: true, default: true })
  isImported: boolean;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Score' }] })
  subscores: Score[];
}

export const ScoreSchema = SchemaFactory.createForClass(Score);