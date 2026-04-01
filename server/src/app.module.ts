import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { LogModule } from './log/log.module';
import { OsuApiModule } from './osu/osu-api.module';
import { TournamentModule } from './tournament/tournament.module';
import { RequestLoggingMiddleware } from './log/request-logger.middleware';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    ConfigModule.forRoot(),
    DiscordModule,
    LogModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DEV_MONGO_SRV'),
      }),
    }),
    OsuApiModule,
    PassportModule.register({ session: true }),
    ScheduleModule.forRoot(),
    TournamentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes("*");
  }
}
