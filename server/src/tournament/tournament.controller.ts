import { Types } from 'mongoose';
import { Express } from 'express';
import { Body, Controller, Get, Param, Post, Patch, ParseIntPipe, Request, UploadedFile, UseGuards, UseInterceptors, Delete, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppOwnerGuard } from 'src/auth/app-owner-guard';
import { Tournament } from 'src/schemas/tournament.schema';
import { TournamentMatch } from 'src/schemas/tournament-match.schema';
import { TournamentPlayer } from 'src/schemas/tournament-player.schema';
import { TournamentRound } from 'src/schemas/tournament-round.schema';
import { TournamentStaffMember } from 'src/schemas/tournament-staff-member.schema';
import { TournamentStaffRole } from 'src/schemas/tournament-staff-role.schema';
import { TournamentTeam } from 'src/schemas/tournament-team.schema';
import { BatchAssignPlayerSeedsDto, BatchAssignTeamSeedsDto, EditTeamNameDto, MappoolSlotDto, MatchSignupDto, ScoreDto, SubmitMatchDto, TournamentDto, TournamentMatchDto, TournamentPlayerDto, TournamentRoundDto, TournamentStaffMemberDto, TournamentStaffRoleDto, TournamentTeamDto } from 'src/models/dtos';
import { TournamentStaffPermission } from 'src/models/enums';
import { ParseObjectIdPipe } from 'src/pipes/object-id.pipe';
import { OsuAuthenticatedGuard } from 'src/auth/osu-oauth.guard';
import { Permissions, TournamentStaffRolesGuard, TournamentStaffRolesRegisterGuard } from 'src/auth/tournament-staff-roles-guard';
import { TournamentService } from './tournament.service';
import { Mappool } from 'src/schemas/mappool.schema';
import { Scoresheet } from 'src/schemas/scoresheet.schema';
import { Score } from 'src/schemas/score.schema';

@Controller('tournament')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @UseGuards(AppOwnerGuard)
  async createTournament(@Body() tournamentDto: TournamentDto, @Request() req): Promise<Tournament> {
    return await this.tournamentService.createTournament(tournamentDto, req.user.osuId);
  }

  @Get()
  async getAllTournaments(): Promise<Tournament[]> {
    return this.tournamentService.getAllListedTournaments();
  }

  @Get(':acronym')
  async getTournament(@Param('acronym') acronym: string): Promise<Tournament> {
    return this.tournamentService.getTournament(acronym);
  }

  @Patch(':acronym')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.EDIT_TOURNAMENT_SETTINGS)
  async editTournament(
      @Param('acronym') acronym: string,
      @Body() tournamentDto: TournamentDto): Promise<Tournament> {
    return this.tournamentService.editTournament(acronym, tournamentDto);
  }

  @Post(':acronym/banner')
  @UseGuards(OsuAuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 1024 * 1024 * 8 } }))
  async uploadTourneyBanner(
      @Param('acronym') acronym: string,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 8 }),
            new FileTypeValidator({ fileType: /^(image\/jpeg|image\/png|image\/gif)$/ }),
          ],
        }),
      )
      file: Express.Multer.File,
      @Request() req): Promise<Tournament> {
    return await this.tournamentService.uploadTourneyBanner(acronym, req.user.osuId, file);
  }

  @Post(':acronym/categoryIcon/:categoryName')
  @UseGuards(OsuAuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 1024 * 1024 * 8 } }))
  async uploadCategoryIcon(
      @Param('acronym') acronym: string,
      @Param('categoryName') categoryName: string,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 8 }),
            new FileTypeValidator({ fileType: /^(image\/jpeg|image\/png|image\/gif)$/ }),
          ],
        }),
      )
      file: Express.Multer.File,
      @Request() req): Promise<Tournament> {
    return await this.tournamentService.uploadCategoryIcon(acronym, categoryName, req.user.osuId, file);
  }

  @Post(':acronym/register')
  @UseGuards(OsuAuthenticatedGuard, TournamentStaffRolesRegisterGuard)
  async register(
      @Param('acronym') acronym: string,
      @Request() req): Promise<TournamentPlayer> {
    return await this.tournamentService.register(acronym, req.user.osuId);
  }

  @Delete(':acronym/unregister')
  @UseGuards(OsuAuthenticatedGuard)
  async unregister(
      @Param('acronym') acronym: string,
      @Request() req) {
    return await this.tournamentService.unregister(acronym, req.user.osuId);
  }

  @Post(':acronym/player/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async addPlayer(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Body() tournamentPlayerDto: TournamentPlayerDto): Promise<TournamentPlayer> {
    return await this.tournamentService.addPlayer(acronym, playerId, tournamentPlayerDto);
  }

  @Patch(':acronym/player/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async editPlayer(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Body() tournamentPlayerDto: TournamentPlayerDto): Promise<TournamentPlayer> {
    return await this.tournamentService.editPlayer(acronym, playerId, tournamentPlayerDto);
  }

  @Delete(':acronym/player/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async removePlayer(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number) {
    return await this.tournamentService.removePlayer(acronym, playerId);
  }

  @Post(':acronym/refreshPlayers')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async refreshPlayers(
      @Param('acronym') acronym: string) {
    return await this.tournamentService.refreshPlayers(acronym);
  }

  @Post(':acronym/refreshPlayer/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async refreshPlayer(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number): Promise<TournamentPlayer> {
    return await this.tournamentService.refreshPlayer(acronym, playerId);
  }

  @Post(':acronym/createTeam')
  @UseGuards(OsuAuthenticatedGuard)
  async createTeam(
      @Param('acronym') acronym: string,
      @Body() tournamentTeamDto: TournamentTeamDto,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.createTeam(acronym, tournamentTeamDto, req.user);
  }

  @Post(':acronym/leaveTeam/:teamId')
  @UseGuards(OsuAuthenticatedGuard)
  async leaveTeam(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Request() req): Promise<TournamentTeam|undefined> {
    return await this.tournamentService.leaveTeam(acronym, teamId, req.user);
  }

  @Post(':acronym/team')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_TEAMS)
  async addTeam(
      @Param('acronym') acronym: string,
      @Body() tournamentTeamDto: TournamentTeamDto): Promise<TournamentTeam> {
    return await this.tournamentService.addTeam(acronym, tournamentTeamDto);
  }

  @Patch(':acronym/team/:teamId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_TEAMS)
  async editTeam(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Body() tournamentTeamDto: TournamentTeamDto): Promise<TournamentTeam> {
    return await this.tournamentService.editTeam(acronym, teamId, tournamentTeamDto);
  }

  @Delete(':acronym/team/:teamId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_TEAMS)
  async removeTeam(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId) {
    return await this.tournamentService.removeTeam(acronym, teamId);
  }

  @Post(':acronym/requestTeam/:teamId')
  @UseGuards(OsuAuthenticatedGuard)
  async requestTeam(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.requestToJoinTeam(acronym, teamId, req.user);
  }

  @Post(':acronym/unrequestTeam/:teamId')
  @UseGuards(OsuAuthenticatedGuard)
  async unrequestTeam(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.retractTeamJoinRequest(acronym, teamId, req.user);
  }

  @Post(':acronym/acceptTeamRequest/:teamId/:playerId')
  @UseGuards(OsuAuthenticatedGuard)
  async acceptTeamRequest(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.acceptTeamJoinRequest(acronym, teamId, playerId, req.user);
  }

  @Post(':acronym/denyTeamRequest/:teamId/:playerId')
  @UseGuards(OsuAuthenticatedGuard)
  async denyTeamRequest(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.denyTeamJoinRequest(acronym, teamId, playerId, req.user);
  }

  @Post(':acronym/removeTeamMember/:teamId/:playerId')
  @UseGuards(OsuAuthenticatedGuard)
  async removeTeamMember(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.removeTeamMember(acronym, teamId, playerId, req.user);
  }

  @Post(':acronym/transferCaptain/:teamId/:playerId')
  @UseGuards(OsuAuthenticatedGuard)
  async transferCaptain(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.transferCaptain(acronym, teamId, playerId, req.user);
  }

  // perms checked within service method instead of using staff role guard
  @Patch(':acronym/teamName/:teamId')
  @UseGuards(OsuAuthenticatedGuard)
  async editTeamName(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @Body() editTeamNameDto: EditTeamNameDto,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.editTeamName(acronym, teamId, editTeamNameDto, req.user);
  }

  // perms checked within service method instead of using staff role guard
  @Post(':acronym/teamImage/:teamId')
  @UseGuards(OsuAuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 1024 * 1024 * 8 } }))
  async uploadTeamImage(
      @Param('acronym') acronym: string,
      @Param('teamId', new ParseObjectIdPipe()) teamId: Types.ObjectId,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 8 }),
            new FileTypeValidator({ fileType: /^(image\/jpeg|image\/png|image\/gif)$/ }),
          ],
        }),
      )
      file: Express.Multer.File,
      @Request() req): Promise<TournamentTeam> {
    return await this.tournamentService.uploadTeamImage(acronym, teamId, file, req.user);
  }

  @Post(':acronym/batchAssignPlayerSeeds')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_PLAYERS)
  async batchAssignPlayerSeeds(
      @Param('acronym') acronym: string,
      @Body() batchAssignPlayerSeedsDto: BatchAssignPlayerSeedsDto): Promise<Tournament> {
    return await this.tournamentService.batchAssignPlayerSeeds(acronym, batchAssignPlayerSeedsDto.playerSeeds);
  }

  @Post(':acronym/batchAssignTeamSeeds')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_TEAMS)
  async batchAssignTeamSeeds(
      @Param('acronym') acronym: string,
      @Body() batchAssignTeamSeedsDto: BatchAssignTeamSeedsDto): Promise<Tournament> {
    return await this.tournamentService.batchAssignTeamSeeds(acronym, batchAssignTeamSeedsDto.teamSeeds);
  }

  @Post(':acronym/staffMember/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_MEMBERS)
  async addStaffMember(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Body() tournamentStaffMemberDto: TournamentStaffMemberDto): Promise<TournamentStaffMember> {
    return await this.tournamentService.addStaffMember(acronym, playerId, tournamentStaffMemberDto);
  }

  @Patch(':acronym/staffMember/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_MEMBERS)
  async editStaffMember(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number,
      @Body() tournamentStaffMemberDto: TournamentStaffMemberDto): Promise<TournamentStaffMember> {
    return await this.tournamentService.editStaffMember(acronym, playerId, tournamentStaffMemberDto);
  }

  @Delete(':acronym/staffMember/:playerId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_MEMBERS)
  async removeStaffMember(
      @Param('acronym') acronym: string,
      @Param('playerId', new ParseIntPipe()) playerId: number) {
    return await this.tournamentService.removeStaffMember(acronym, playerId);
  }

  @Post(':acronym/staffRole')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_ROLES)
  async addStaffRole(
      @Param('acronym') acronym: string,
      @Body() tournamentStaffRoleDto: TournamentStaffRoleDto): Promise<TournamentStaffRole> {
    return await this.tournamentService.addStaffRole(acronym, tournamentStaffRoleDto);
  }

  @Patch(':acronym/staffRole/:roleId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_ROLES)
  async editStaffRole(
      @Param('acronym') acronym: string,
      @Param('roleId', new ParseObjectIdPipe()) roleId: Types.ObjectId,
      @Body() tournamentStaffRoleDto: TournamentStaffRoleDto): Promise<TournamentStaffRole> {
    return await this.tournamentService.editStaffRole(acronym, roleId, tournamentStaffRoleDto);
  }

  @Delete(':acronym/staffRole/:roleId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STAFF_ROLES)
  async removeStaffRole(
      @Param('acronym') acronym: string,
      @Param('roleId', new ParseObjectIdPipe()) roleId: Types.ObjectId) {
    return await this.tournamentService.removeStaffRole(acronym, roleId);
  }

  @Get(':acronym/matches')
  async getAllMatches(@Param('acronym') acronym: string): Promise<TournamentMatch[]> {
    return this.tournamentService.getAllMatches(acronym);
  }
  
  @Post(':acronym/round')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_ROUNDS)
  async createTournamentRound(
      @Param('acronym') acronym: string,
      @Body() tournamentRoundDto: TournamentRoundDto): Promise<TournamentRound> {
    return await this.tournamentService.createTournamentRound(acronym, tournamentRoundDto);
  }

  @Get(':acronym/round/:roundId')
  async getTournamentRound(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Request() req): Promise<TournamentRound> {
    return await this.tournamentService.getTournamentRound(acronym, roundId, req.user);
  }

  @Patch(':acronym/round/:roundId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_ROUNDS)
  async editTournamentRound(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Body() tournamentRoundDto: TournamentRoundDto): Promise<TournamentRound> {
    return await this.tournamentService.editTournamentRound(acronym, roundId, tournamentRoundDto);
  }

  @Delete(':acronym/round/:roundId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_ROUNDS)
  async removeTournamentRound(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId) {
    return await this.tournamentService.removeTournamentRound(acronym, roundId);
  }

  // getTournamentRound will have mappool filled out if mappoolWip is false. This endpoint is for staff members with permission to view wip mappools details.
  @Get(':acronym/mappool/:mappoolId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.VIEW_WIP_MAPPOOLS)
  async getTournamentMappool(
      @Param('acronym') acronym: string,
      @Param('mappoolId', new ParseObjectIdPipe()) mappoolId: Types.ObjectId): Promise<Mappool> {
    return await this.tournamentService.getTournamentMappool(mappoolId);
  }

  // getTournamentRound will have scoresheet filled out if scoresheetWip is false. This endpoint is for staff members with permission to view wip scoresheet details.
  @Get(':acronym/scoresheet/:scoresheetId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.VIEW_WIP_SCORESHEETS)
  async getTournamentScoresheet(
      @Param('acronym') acronym: string,
      @Param('scoresheetId', new ParseObjectIdPipe()) scoresheetId: Types.ObjectId): Promise<Scoresheet> {
    return await this.tournamentService.getTournamentScoresheet(scoresheetId);
  }

  @Post(':acronym/round/:roundId/slot')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_SLOTS)
  async addTournamentSlot(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Body() mappoolSlotDto: MappoolSlotDto) {
    return await this.tournamentService.addMappoolSlot(acronym, roundId, mappoolSlotDto);
  }

  @Patch(':acronym/round/:roundId/slot/:slotId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_SLOTS)
  async editTournamentSlot(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('slotId', new ParseObjectIdPipe()) slotId: Types.ObjectId,
      @Body() mappoolSlotDto: MappoolSlotDto) {
    return await this.tournamentService.editMappoolSlot(acronym, roundId, slotId, mappoolSlotDto);
  }

  @Delete(':acronym/round/:roundId/slot/:slotId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_SLOTS)
  async removeTournamentSlot(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('slotId', new ParseObjectIdPipe()) slotId: Types.ObjectId) {
    return await this.tournamentService.removeMappoolSlot(acronym, roundId, slotId);
  }

  @Post(':acronym/round/:roundId/match')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_MATCHES)
  async addTournamentMatch(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Body() tournamentMatchDto: TournamentMatchDto): Promise<TournamentMatch> {
    return await this.tournamentService.addTournamentMatch(acronym, roundId, tournamentMatchDto);
  }
  
  @Patch(':acronym/round/:roundId/match/:matchId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_MATCHES)
  async editTournamentMatch(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Body() tournamentMatchDto: TournamentMatchDto): Promise<TournamentMatch> {
    return this.tournamentService.editTournamentMatch(acronym, roundId, matchId, tournamentMatchDto);
  }

  @Delete(':acronym/round/:roundId/match/:matchId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_MATCHES)
  async removeTournamentMatch(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId) {
    return await this.tournamentService.removeTournamentMatch(acronym, roundId, matchId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/matchRegister')
  @UseGuards(OsuAuthenticatedGuard)
  async matchRegister(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Body() matchSignupDto: MatchSignupDto,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchRegister(acronym, roundId, matchId, req.user, new Types.ObjectId(matchSignupDto.teamId));
  }

  @Post(':acronym/round/:roundId/match/:matchId/matchUnregister')
  @UseGuards(OsuAuthenticatedGuard)
  async matchUnregister(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Body() matchSignupDto: MatchSignupDto,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchUnregister(acronym, roundId, matchId, req.user, new Types.ObjectId(matchSignupDto.teamId));
  }

  @Post(':acronym/round/:roundId/submitMatch')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.SUBMIT_MATCHES)
  async submitMatch(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Body() submitMatchDto: SubmitMatchDto,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.submitMatch(acronym, roundId, submitMatchDto, req.user);
  }

  @Post(':acronym/round/:roundId/match/:matchId/registerReferee')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_REFEREE)
  async matchStaffRegisterReferee(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffRegister(acronym, roundId, matchId, "referee", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/unregisterReferee')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_REFEREE)
  async matchStaffUnregisterReferee(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffUnregister(acronym, roundId, matchId, "referee", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/registerStreamer')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_STREAMER)
  async matchStaffRegisterStreamer(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffRegister(acronym, roundId, matchId, "streamer", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/unregisterStreamer')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_STREAMER)
  async matchStaffUnregisterStreamer(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffUnregister(acronym, roundId, matchId, "streamer", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/registerCommentator')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_COMMENTATOR)
  async matchStaffRegisterCommentator(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffRegister(acronym, roundId, matchId, "commentator", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/match/:matchId/unregisterCommentator')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.REGISTER_COMMENTATOR)
  async matchStaffUnregisterCommentator(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('matchId', new ParseObjectIdPipe()) matchId: Types.ObjectId,
      @Request() req): Promise<TournamentMatch> {
    return await this.tournamentService.matchStaffUnregister(acronym, roundId, matchId, "commentator", req.user.osuId);
  }

  @Post(':acronym/round/:roundId/stats/:slotScoresheetId/:playerOrTeamId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STATS)
  async createScore(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('slotScoresheetId', new ParseObjectIdPipe()) slotScoresheetId: Types.ObjectId,
      @Param('playerOrTeamId') playerOrTeamId: string,
      @Body() scoreDto: ScoreDto): Promise<Score> {
    return await this.tournamentService.createScore(acronym, roundId, slotScoresheetId, playerOrTeamId, scoreDto);
  }

  @Patch(':acronym/round/:roundId/stats/:slotScoresheetId/:scoreId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STATS)
  async editScore(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('slotScoresheetId', new ParseObjectIdPipe()) slotScoresheetId: Types.ObjectId,
      @Param('scoreId', new ParseObjectIdPipe()) scoreId: Types.ObjectId,
      @Body() editScoreDto: ScoreDto): Promise<Score> {
    return await this.tournamentService.editScore(acronym, roundId, slotScoresheetId, scoreId, editScoreDto);
  }

  @Delete(':acronym/round/:roundId/stats/:slotScoresheetId/:scoreId')
  @UseGuards(TournamentStaffRolesGuard)
  @Permissions(TournamentStaffPermission.MANAGE_STATS)
  async deleteScore(
      @Param('acronym') acronym: string,
      @Param('roundId', new ParseObjectIdPipe()) roundId: Types.ObjectId,
      @Param('slotScoresheetId', new ParseObjectIdPipe()) slotScoresheetId: Types.ObjectId,
      @Param('scoreId', new ParseObjectIdPipe()) scoreId: Types.ObjectId) {
    return await this.tournamentService.deleteScore(acronym, roundId, slotScoresheetId, scoreId);
  }
}