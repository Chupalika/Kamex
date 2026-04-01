import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { TournamentPlayer } from './tournament-player.schema';

export type TournamentTeamDocument = HydratedDocument<TournamentTeam>;

@Schema({ timestamps: true })
export class TournamentTeam {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' }], default: [] })
  players: TournamentPlayer[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' }], default: [] })
  joinRequests: TournamentPlayer[];

  @Prop()
  imageLink: string;

  @Prop()
  seed: string;
}

export const TournamentTeamSchema = SchemaFactory.createForClass(TournamentTeam);