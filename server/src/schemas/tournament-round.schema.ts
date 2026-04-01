import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Mappool } from './mappool.schema';
import { Scoresheet } from './scoresheet.schema';
import { TournamentMatch } from './tournament-match.schema';
import * as mongoose from 'mongoose';

export type TournamentRoundDocument = HydratedDocument<TournamentRound>;

@Schema({ timestamps: true })
export class TournamentRound {
  @Prop({ required: true })
  name: string;

  /*
  @Prop({ required: true, default: 0 })
  pointsToWin: number;
  */

  @Prop({ required: true, default: new Date() })
  startDate: Date;

  /*
  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentPick' }], default: [] })
  picks: TournamentPick[];
  */

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Mappool' })
  mappool: Mappool;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Scoresheet' })
  scoresheet: Scoresheet;

  /*
  @Prop({ required: true, default: "match" })
  format: "match"|"lobby";
  */

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentMatch' }], default: [] })
  matches: TournamentMatch[];

  @Prop({ required: true, default: true })
  mappoolWip: boolean;

  @Prop({ required: true, default: true })
  scoresheetWip: boolean;
}

export const TournamentRoundSchema = SchemaFactory.createForClass(TournamentRound);