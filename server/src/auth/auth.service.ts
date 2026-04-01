import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AppUserDto } from "src/models/dtos";
import { AppUser } from "src/schemas/app-user.schema";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AppUser.name) private appUserModel: Model<AppUser>,
  ) {}

  async unlinkDiscord(osuId: number): Promise<AppUser> {
    const appUser = await this.appUserModel.findOne({ osuId });
    appUser.discordId = "";
    appUser.discordUsername = "";
    await appUser.save();
    return appUser;
  }

  async updateUserSettings(osuId: number, appUserDto: AppUserDto): Promise<AppUser> {
    const appUser = await this.appUserModel.findOne({ osuId });
    appUser.timezone = appUserDto.timezone;
    await appUser.save();
    return appUser;
  }
}