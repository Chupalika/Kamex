import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Mappool } from './mappool.schema';
import * as mongoose from 'mongoose';
import { MappoolSlotScoresheet } from './mappool-slot-scoresheet.schema';

export type ScoresheetDocument = HydratedDocument<Scoresheet>;

@Schema({ timestamps: true })
export class Scoresheet {
  @Prop()
  name: string;

  @Prop({ required: true, default: false })
  isPublic: boolean;

  @Prop({ required: true, default: 1926383 })
  ownerId: number;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Mappool' })
  mappool: Mappool;

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MappoolSlotScoresheet' }], default: [] })
  slotScoresheets: MappoolSlotScoresheet[];
}

export const ScoresheetSchema = SchemaFactory.createForClass(Scoresheet);