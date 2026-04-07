import { HydratedDocument, Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Page } from 'src/schemas/page.schema';

@Injectable()
export class ContentService {
  constructor(@InjectModel(Page.name) private pageModel: Model<Page>) {}

  async getPage(name: string): Promise<HydratedDocument<Page>> {
    return this.pageModel.findOne({ name }).orFail();
  }
}