import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { AppUser } from './app-user.schema';

export type TournamentPlayerDocument = HydratedDocument<TournamentPlayer>;

@Schema({ timestamps: true })
export class TournamentPlayer {
  @Prop({ required: true })
  playerId: number;

  @Prop({ required: true })
  username: string;

  @Prop({ requried: true })
  country: string;

  @Prop()
  osuRank: number;

  @Prop()
  osuPP: number;

  @Prop()
  taikoRank: number;

  @Prop()
  taikoPP: number;

  @Prop()
  fruitsRank: number;

  @Prop()
  fruitsPP: number;

  @Prop()
  maniaRank: number;

  @Prop()
  maniaPP: number;

  @Prop()
  seed: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', unique: true, sparse: true })
  appUser: AppUser;
}

export const TournamentPlayerSchema = SchemaFactory.createForClass(TournamentPlayer);