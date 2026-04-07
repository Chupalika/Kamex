import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Content } from 'src/models/models';

export type PageDocument = HydratedDocument<Page>;

@Schema({ timestamps: true })
export class Page {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, default: [] })
  contents: Content[];
}

export const PageSchema = SchemaFactory.createForClass(Page);