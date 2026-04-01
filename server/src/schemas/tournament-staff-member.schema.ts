import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TournamentStaffRole } from './tournament-staff-role.schema';
import * as mongoose from 'mongoose';
import { AppUser } from './app-user.schema';

export type TournamentStaffMemberDocument = HydratedDocument<TournamentStaffMember>;

@Schema({ timestamps: true })
export class TournamentStaffMember {
  @Prop({ required: true })
  playerId: number;

  @Prop({ required: true })
  username: string;

  @Prop({ requried: true })
  country: string;

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStaffRole' }], default: [] })
  roles: TournamentStaffRole[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', unique: true, sparse: true })
  appUser: AppUser;
}

export const TournamentStaffMemberSchema = SchemaFactory.createForClass(TournamentStaffMember);