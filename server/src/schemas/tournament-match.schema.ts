import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { TournamentPlayer } from './tournament-player.schema';
import { TournamentTeam } from './tournament-team.schema';
import { TournamentMatchConditional, TournamentMatchEvent, TournamentMatchParticipant } from 'src/models/models';
import { TournamentStaffMember } from './tournament-staff-member.schema';

//mongoose.Schema.Types.String.checkRequired(v => typeof v === 'string');

export type TournamentMatchDocument = HydratedDocument<TournamentMatch>;

@Schema({ timestamps: true })
export class TournamentMatch {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, default: new Date() })
  time: Date;

  @Prop({ required: true, default: false})
  isTeamMatch: boolean;

  @Prop({ required: true, default: "versus" })
  type: "versus"|"lobby";

  @Prop({ required: true, default: false })
  enableSignups: boolean;

  @Prop({ required: true, default: 8 })
  maxLobbyParticipants: number;

  /*
  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' }], default: [] })
  players: TournamentPlayer[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentTeam' }], default: [] })
  teams: TournamentTeam[];
  */

  @Prop({ required: true, default: [] })
  participants: TournamentMatchParticipant[];

  @Prop({ required: true, default: [] })
  conditionals: TournamentMatchConditional[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffMember' }], default: [] })
  referees: TournamentStaffMember[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffMember' }], default: [] })
  streamers: TournamentStaffMember[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffMember' }], default: [] })
  commentators: TournamentStaffMember[];

  @Prop({ required: true, default: [] })
  matchIds: number[];

  @Prop({ required: true, default: [] })
  vodLinks: string[];

  @Prop({ required: true, default: [] })
  matchProgression: TournamentMatchEvent[];
}

export const TournamentMatchSchema = SchemaFactory.createForClass(TournamentMatch);