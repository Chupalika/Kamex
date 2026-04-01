import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MappoolSlotNoteEntryDocument = HydratedDocument<MappoolSlotNoteEntry>;

@Schema({ timestamps: true })
export class MappoolSlotNoteEntry {
  @Prop({ required: true, default: 0 })
  rating: number;

  @Prop({ required: true, default: "" })
  note: string;
}

export const MappoolSlotNoteEntrySchema = SchemaFactory.createForClass(MappoolSlotNoteEntry);