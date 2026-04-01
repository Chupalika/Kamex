import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AppUser } from 'src/schemas/app-user.schema';
import { RequestWithUser } from 'src/models/models';
import { DiscordUserAlreadyLinkedError } from 'src/models/errors';

@Injectable()
export class DiscordOAuthStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
      private configService: ConfigService,
      @InjectModel(AppUser.name) private appUserModel: Model<AppUser>) {
    super({
      authorizationURL: "https://discord.com/api/oauth2/authorize",
      tokenURL: "https://discord.com/api/oauth2/token",
      clientID: configService.get("DISCORD_CLIENT_ID"),
      clientSecret: configService.get("DISCORD_CLIENT_SECRET"),
      callbackURL: '/api/auth/login-discord-callback',
      scope: ['identify'],
      passReqToCallback: true,
    });
  }

  async validate(req: RequestWithUser, accessToken: string, refreshToken: string, profile: any): Promise<any> {
    const me = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json());

    const exists = await this.appUserModel.exists({ discordId: me.id.toString() });
    if (exists) throw new DiscordUserAlreadyLinkedError(me.id.toString());

    const existingUser = await this.appUserModel.findOne({ osuId: req.user.osuId });
    existingUser.discordId = me.id.toString();
    existingUser.discordUsername = me.username;
    await existingUser.save();
    return existingUser;
  }
}