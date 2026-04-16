import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TournamentPlayer } from './tournament-player.schema';
import { TournamentRound } from './tournament-round.schema';
import { TournamentStaffMember } from './tournament-staff-member.schema';
import { TournamentStaffRole } from './tournament-staff-role.schema';
import { TournamentTeam } from './tournament-team.schema';
import { GameMode, TournamentProgress } from 'src/models/enums';
import { SlotCategory, RegistrationSettings, TournamentLink, TournamentTheme, DiscordSettings } from 'src/models/models';
import * as mongoose from 'mongoose';

export type TournamentDocument = HydratedDocument<Tournament>;

@Schema({ timestamps: true, minimize: false })
export class Tournament {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  acronym: string;

  @Prop({ required: true, default: false })
  unlisted: boolean;

  @Prop({ required: true, default: TournamentProgress.PLANNING })
  progress: TournamentProgress;

  @Prop({ required: true, default: GameMode.OSU })
  gameMode: GameMode;

  @Prop({ required: true, default: false })
  enableTeams: boolean;

  @Prop({ required: true, default: false })
  allowTeamEditAfterRegistration: boolean;

  @Prop({ required: true, default: 1926383 })
  ownerId: number;

  @Prop()
  challongeId: string;

  @Prop()
  challongeUrl: string;
  
  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentRound' }], default: [] })
  rounds: TournamentRound[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPlayer' }], default: [] })
  players: TournamentPlayer[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentTeam' }], default: [] })
  teams: TournamentTeam[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffMember' }], default: [] })
  staffMembers: TournamentStaffMember[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffRole' }], default: [] })
  staffRoles: TournamentStaffRole[];

  @Prop({ required: true, default: { startDate: new Date(), endDate: new Date(), minTeamSize: 1, maxTeamSize: 1, minRank: 0, maxRank: 0, enforceDiscord: false } })
  registrationSettings: RegistrationSettings;

  @Prop({ required: true, default: {} })
  discordSettings: DiscordSettings;

  @Prop({ required: true, default: "" })
  bannerLink: string;

  @Prop({ required: true, default: { primaryColor: "", accentColor: "" } })
  theme: TournamentTheme;

  @Prop({ required: true, default: "" })
  description: string;

  @Prop({ required: true, default: [] })
  links: TournamentLink[];

  @Prop({ required: true, default: [] })
  slotCategories: SlotCategory[];
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
