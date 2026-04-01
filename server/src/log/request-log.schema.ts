import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestLogDocument = HydratedDocument<RequestLog>;

@Schema({ timestamps: true })
export class RequestLog {
  @Prop({ required: true })
  method: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  body: string;

  @Prop()
  user: string;

  @Prop({ required: true })
  statusCode: number;
}

export const RequestLogSchema = SchemaFactory.createForClass(RequestLog);
