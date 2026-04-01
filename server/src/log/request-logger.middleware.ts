import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestLog } from './request-log.schema';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(@InjectModel(RequestLog.name) private requestLogModel: Model<RequestLog>) {}

  use(req, res, next) {
    res.on("finish", async () => {
      const createdLog = new this.requestLogModel({
        method: req.method,
        url: req.originalUrl,
        body: JSON.stringify(req.body),
        user: req.user?.osuId,
        statusCode: res.statusCode,
      });
      createdLog.save();
    });
    next();
  }
}