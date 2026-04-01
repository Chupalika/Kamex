import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestLog, RequestLogSchema } from './request-log.schema';
import { RequestLoggingMiddleware } from './request-logger.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RequestLog.name, schema: RequestLogSchema }]),
  ],
  providers: [RequestLoggingMiddleware],
  exports: [MongooseModule],
})
export class LogModule {}