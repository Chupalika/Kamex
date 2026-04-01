import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OsuApiModule } from 'src/osu/osu-api.module';
import { AppUser, AppUserSchema } from 'src/schemas/app-user.schema';
import { Beatmap, BeatmapSchema } from 'src/schemas/beatmap.schema';
import { Mappool, MappoolSchema } from 'src/schemas/mappool.schema';
import { MappoolSlot, MappoolSlotSchema } from 'src/schemas/mappool-slot.schema';
import { MappoolSlotScoresheet, MappoolSlotScoresheetSchema } from 'src/schemas/mappool-slot-scoresheet.schema';
import { MappoolSlotScoresheetEntry, MappoolSlotScoresheetEntrySchema } from 'src/schemas/mappool-slot-scoresheet-entry.schema';
import { Score, ScoreSchema } from 'src/schemas/score.schema';
import { Scoresheet, ScoresheetSchema } from 'src/schemas/scoresheet.schema';
import { Tournament, TournamentSchema } from 'src/schemas/tournament.schema';
import { TournamentLobby, TournamentLobbySchema } from 'src/schemas/tournament-lobby.schema';
import { TournamentMatch, TournamentMatchSchema } from 'src/schemas/tournament-match.schema';
import { TournamentPlayer, TournamentPlayerSchema } from 'src/schemas/tournament-player.schema';
import { TournamentRound, TournamentRoundSchema } from 'src/schemas/tournament-round.schema';
import { TournamentStaffMember, TournamentStaffMemberSchema } from 'src/schemas/tournament-staff-member.schema';
import { TournamentStaffRole, TournamentStaffRoleSchema } from 'src/schemas/tournament-staff-role.schema';
import { TournamentTeam, TournamentTeamSchema } from 'src/schemas/tournament-team.schema';
import { TournamentController } from 'src/tournament/tournament.controller';
import { TournamentService } from 'src/tournament/tournament.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule,
    DiscordModule,
    MongooseModule.forFeature([
      { name: AppUser.name, schema: AppUserSchema },
      { name: Beatmap.name, schema: BeatmapSchema },
      { name: Mappool.name, schema: MappoolSchema },
      { name: MappoolSlot.name, schema: MappoolSlotSchema },
      { name: MappoolSlotScoresheet.name, schema: MappoolSlotScoresheetSchema },
      { name: MappoolSlotScoresheetEntry.name, schema: MappoolSlotScoresheetEntrySchema },
      { name: Score.name, schema: ScoreSchema },
      { name: Scoresheet.name, schema: ScoresheetSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentLobby.name, schema: TournamentLobbySchema },
      { name: TournamentMatch.name, schema: TournamentMatchSchema },
      { name: TournamentPlayer.name, schema: TournamentPlayerSchema },
      { name: TournamentRound.name, schema: TournamentRoundSchema },
      { name: TournamentStaffMember.name, schema: TournamentStaffMemberSchema },
      { name: TournamentStaffRole.name, schema: TournamentStaffRoleSchema },
      { name: TournamentTeam.name, schema: TournamentTeamSchema },
    ]),
    OsuApiModule,
  ],
  controllers: [TournamentController],
  providers: [TournamentService],
})
export class TournamentModule {}
