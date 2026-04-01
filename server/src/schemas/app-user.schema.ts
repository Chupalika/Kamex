import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppUserDocument = HydratedDocument<AppUser>;

@Schema({ timestamps: true })
export class AppUser {
  @Prop({ required: true, unique: true })
  osuId: number;

  @Prop({ required: true })
  osuUsername: string;

  @Prop({ required: true })
  osuCountryCode: string;

  @Prop({ required: true })
  osuAvatarUrl: string;

  @Prop({ required: true, default: "" })
  discordId?: string;

  @Prop({ required: true, default: "" })
  discordUsername?: string;

  @Prop({ required: true, default: 0 })
  timezone: number;

  @Prop({ required: true })
  loginTimestamp: Date;
}

export const AppUserSchema = SchemaFactory.createForClass(AppUser);