import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MappoolSlot } from './mappool-slot.schema';
import { MappoolSlotScoresheetEntry } from './mappool-slot-scoresheet-entry.schema';
import { MappoolSlotNoteEntry } from './mappool-slot-note-entry.schema';
import * as mongoose from 'mongoose';

export type MappoolSlotScoresheetDocument = HydratedDocument<MappoolSlotScoresheet>;

@Schema({ timestamps: true })
export class MappoolSlotScoresheet {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'MappoolSlot' })
  slot: MappoolSlot;

  // Arrays because mongoose doesn't support maps well - build maps in app logic
  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MappoolSlotScoresheetEntry' }], default: [] })
  playerScores: MappoolSlotScoresheetEntry[];

  @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MappoolSlotScoresheetEntry' }], default: [] })
  teamScores: MappoolSlotScoresheetEntry[];

  @Prop({ required: true, default: [] })
  playerNotes: MappoolSlotNoteEntry[];
}

export const MappoolSlotScoresheetSchema = SchemaFactory.createForClass(MappoolSlotScoresheet);