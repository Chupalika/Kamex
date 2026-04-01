import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GameMode } from '../models/enums';
import * as mongoose from 'mongoose';

mongoose.Schema.Types.String.checkRequired(v => typeof v === 'string');

export type BeatmapDocument = HydratedDocument<Beatmap>;

@Schema({ timestamps: true })
export class Beatmap {
  @Prop({ required: true })
  beatmapId: number;

  @Prop({ required: true })
  beatmapSetId: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  artist: string;

  @Prop({ required: true, default: "" })
  source: string;

  @Prop({ required: true })
  difficultyName: string;

  @Prop({ required: true })
  mapper: string;

  @Prop({ required: true, default: [] })
  mappers: string[];

  @Prop({ required: true })
  gameMode: GameMode;

  @Prop({ required: true })
  starRating: number;

  @Prop({ required: true })
  length: number;

  @Prop({ required: true })
  bpm: number;

  @Prop({ required: true })
  cs: number;

  @Prop({ required: true })
  hp: number;

  @Prop({ required: true })
  od: number;

  @Prop({ required: true })
  ar: number;

  @Prop({ required: true, default: new Date() })
  lastUpdated: Date;
}

export const BeatmapSchema = SchemaFactory.createForClass(Beatmap);