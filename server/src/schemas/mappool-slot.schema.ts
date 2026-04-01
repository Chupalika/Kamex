import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Beatmap } from './beatmap.schema';
import { GameMode } from 'src/models/enums';
import { ScoreMod } from 'src/models/models';
import * as mongoose from 'mongoose';

export type MappoolSlotDocument = HydratedDocument<MappoolSlot>;

@Schema({ timestamps: true })
export class MappoolSlot {
  @Prop({ required: true })
    label: string;
  
    @Prop({ required: true, default: "" })
    category: string;
  
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Beatmap' })
    beatmap: Beatmap;
  
    @Prop({ required: true, default: [] })
    requiredMods: ScoreMod[];
  
    @Prop({ required: true, default: [] })
    validModCombinations: ScoreMod[][];
  
    @Prop()
    gameMode: GameMode;
  
    @Prop()
    adjustedStarRating: number;
}

export const MappoolSlotSchema = SchemaFactory.createForClass(MappoolSlot);