import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MappoolSlot } from './mappool-slot.schema';
import { TournamentRound } from './tournament-round.schema';
import * as mongoose from 'mongoose';

export type MappoolDocument = HydratedDocument<Mappool>;

@Schema({ timestamps: true })
export class Mappool {
  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MappoolSlot' }], default: [] })
  slots: MappoolSlot[];

  @Prop()
  authorId: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'TournamentRound' })
  tournamentRound: TournamentRound;

  @Prop()
  downloadUrl: string;
}

export const MappoolSchema = SchemaFactory.createForClass(Mappool);