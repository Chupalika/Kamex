import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { DiscordOAuthStrategy } from './discord.strategy';
import { OsuOAuthStrategy } from './osu.strategy';
import { AppUser, AppUserSchema } from '../schemas/app-user.schema';
import { SessionSerializer } from './session-serializer';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: AppUser.name, schema: AppUserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, DiscordOAuthStrategy, OsuOAuthStrategy, SessionSerializer],
})
export class AuthModule {}