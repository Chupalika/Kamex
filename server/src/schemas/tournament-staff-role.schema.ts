import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TournamentStaffRoleDocument = HydratedDocument<TournamentStaffRole>;

@Schema({ timestamps: true })
export class TournamentStaffRole {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: [] })
  permissions: string[]; // List of allowed api routes (e.g. `:acronym/player/:playerId`)
}

export const TournamentStaffRoleSchema = SchemaFactory.createForClass(TournamentStaffRole);