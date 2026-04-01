import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AppUser } from 'src/schemas/app-user.schema';

@Injectable()
export class OsuOAuthStrategy extends PassportStrategy(Strategy, 'osu') {
  constructor(
      private configService: ConfigService,
      @InjectModel(AppUser.name) private appUserModel: Model<AppUser>) {
    super({
      authorizationURL: "https://osu.ppy.sh/oauth/authorize",
      tokenURL: "https://osu.ppy.sh/oauth/token",
      clientID: configService.get("OSU_API_V2_CLIENT_ID"),
      clientSecret: configService.get("OSU_API_V2_CLIENT_SECRET"),
      callbackURL: '/api/auth/login-osu-callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    const me = await fetch("https://osu.ppy.sh/api/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json());

    const existingUser = await this.appUserModel.findOne({ osuId: me.id });
    if (existingUser) {
      if (existingUser.osuUsername !== me.username) {
        // if user had a namechange, update the db entry
        existingUser.osuUsername = me.username;
      }
      existingUser.loginTimestamp = new Date();
      await existingUser.save();
      return existingUser;
    } else {
      const appUser = new this.appUserModel({
        osuId: me.id,
        osuUsername: me.username,
        osuCountryCode: me.country_code,
        osuAvatarUrl: me.avatar_url,
        loginTimestamp: new Date(),
      });
      await appUser.save();
      return appUser;
    }
  }
}