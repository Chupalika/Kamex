import { Model, Types, HydratedDocument } from 'mongoose';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Score } from '../schemas/score.schema';
import { Scoresheet } from '../schemas/scoresheet.schema';

@Injectable()
export class ScoresheetService {
  constructor(
    @InjectModel(Score.name) private scoreModel: Model<Score>,
    @InjectModel(Scoresheet.name) private scoresheetModel: Model<Scoresheet>) {}
}