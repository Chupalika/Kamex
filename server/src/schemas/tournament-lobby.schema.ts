import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { TournamentPlayer } from './tournament-player.schema';
import { TournamentTeam } from './tournament-team.schema';

//mongoose.Schema.Types.String.checkRequired(v => typeof v === 'string');

export type TournamentLobbyDocument = HydratedDocument<TournamentLobby>;

@Schema({ timestamps: true })
export class TournamentLobby {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, default: new Date() })
  time: Date;

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' }], default: [] })
  players: TournamentPlayer[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentTeam' }], default: [] })
  teams: TournamentTeam[];

  @Prop({ required: true, default: [] })
  matchIds: number[];
}

export const TournamentLobbySchema = SchemaFactory.createForClass(TournamentLobby);