import { Model } from 'mongoose';
import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AppUser } from 'src/schemas/app-user.schema';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(@InjectModel(AppUser.name) private appUserModel: Model<AppUser>) {
    super();
  }

  serializeUser(user: AppUser, done: (error: Error, user: AppUser) => void) {
    done(null, user);
  }

  async deserializeUser(user: AppUser, done: (error: Error, user: AppUser) => void) {
    const existingUser = await this.appUserModel.findOne({ osuId: user.osuId });
    return existingUser ? done(null, existingUser) : done(null, null);
  }
}