import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TournamentPlayer } from './tournament-player.schema';
import { TournamentTeam } from './tournament-team.schema';
import { Score } from './score.schema';
import * as mongoose from 'mongoose';

export type MappoolSlotScoresheetEntryDocument = HydratedDocument<MappoolSlotScoresheetEntry>;

@Schema({ timestamps: true })
export class MappoolSlotScoresheetEntry {
  // Only one or the other should be used
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' })
  player: TournamentPlayer;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentTeam' })
  team: TournamentTeam;

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Score' }], default: [] })
  scores: Score[];
}

export const MappoolSlotScoresheetEntrySchema = SchemaFactory.createForClass(MappoolSlotScoresheetEntry);