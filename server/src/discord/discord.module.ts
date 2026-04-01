import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppUser, AppUserSchema } from 'src/schemas/app-user.schema';
import { Tournament, TournamentSchema } from 'src/schemas/tournament.schema';
import { TournamentPlayer, TournamentPlayerSchema } from 'src/schemas/tournament-player.schema';
import { TournamentTeam, TournamentTeamSchema } from 'src/schemas/tournament-team.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AppUser.name, schema: AppUserSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentPlayer.name, schema: TournamentPlayerSchema },
      { name: TournamentTeam.name, schema: TournamentTeamSchema },
    ]),
  ],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}