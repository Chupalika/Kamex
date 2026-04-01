import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, Types.ObjectId> {
  transform(value: any): Types.ObjectId {
    try {
        const transformedObjectId: Types.ObjectId = Types.ObjectId.createFromHexString(value);
        return transformedObjectId;
      } catch (error) {
        throw new BadRequestException('Invalid ObjectId');
    }
  }
}