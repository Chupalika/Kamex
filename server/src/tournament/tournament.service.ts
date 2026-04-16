import { Model, Types, HydratedDocument, isValidObjectId, Document, ObjectId } from 'mongoose';
import { ForbiddenException, Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MappoolSlotDto, TournamentDto, TournamentMatchDto, TournamentRoundDto, TournamentPlayerDto, TournamentStaffMemberDto, TournamentStaffRoleDto, ScoreDto, TournamentTeamDto, SubmitMatchDto, OsuUserDto, EditTeamNameDto } from '../models/dtos';
import { NotTeamCaptainError, MatchExistsError, PlayerExistsError, PlayerNotRegisteredError, MappoolSlotExistsError, ProgressChangeError, ProgressChangeConflictError, ProgressLockedError, RegistrationClosedError, StaffMemberExistsError, StaffRoleExistsError, TeamCaptainError, TeamCaptainExistsError, TeamExistsError, PlayerNotFoundOnTeamError, TeamMissingPlayersError, TeamNotFoundError, RankRequirementNotMetError, DiscordNotLinkedError, DiscordServerAlreadyUsedError, RefreshPlayersPartialFailure, MatchStaffAlreadyRegisteredError, StaffMemberNotFoundError, StaffRoleNotFoundError, MappoolSlotNotFoundError, AlreadySignedUpToMatchError, MatchNotFoundError, TournamentRoundNotFoundError, MatchSignupsNotEnabledError, MatchSignupLateError, MatchSignupFullError, DiscordServerNotFoundError, DiscordServerNotSetupError, DiscordMemberNotFoundError, NotADiscordMemberError, ScoreNotFoundError, MappoolSlotScoresheetNotFoundError, PlayerOrTeamNotFoundError, SlotCategoryNotFoundError } from '../models/errors';
import { GameMode, TournamentProgress } from '../models/enums';
import { PlayerOrTeam, ScoreMod, TournamentMatchEvent, TournamentMatchParticipant } from '../models/models';
import { AppUser } from 'src/schemas/app-user.schema';
import { Beatmap } from '../schemas/beatmap.schema';
import { Mappool } from '../schemas/mappool.schema';
import { MappoolSlot } from '../schemas/mappool-slot.schema';
import { MappoolSlotScoresheet } from '../schemas/mappool-slot-scoresheet.schema';
import { MappoolSlotScoresheetEntry } from '../schemas/mappool-slot-scoresheet-entry.schema';
import { Score } from '../schemas/score.schema';
import { Scoresheet } from '../schemas/scoresheet.schema';
import { Tournament } from '../schemas/tournament.schema';
import { TournamentMatch } from '../schemas/tournament-match.schema';
import { TournamentPlayer } from '../schemas/tournament-player.schema';
import { TournamentRound } from '../schemas/tournament-round.schema';
import { TournamentStaffMember } from '../schemas/tournament-staff-member.schema';
import { TournamentStaffRole } from '../schemas/tournament-staff-role.schema';
import { TournamentTeam } from '../schemas/tournament-team.schema';
import { OsuApiService } from 'src/osu/osu-api.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { DiscordService } from 'src/discord/discord.service';
import * as mongoose from 'mongoose';

@Injectable()
export class TournamentService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<Tournament>,
    @InjectModel(TournamentRound.name) private tournamentRoundModel: Model<TournamentRound>,
    @InjectModel(TournamentPlayer.name) private tournamentPlayerModel: Model<TournamentPlayer>,
    @InjectModel(TournamentTeam.name) private tournamentTeamModel: Model<TournamentTeam>,
    @InjectModel(TournamentMatch.name) private tournamentMatchModel: Model<TournamentMatch>,
    @InjectModel(TournamentStaffMember.name) private tournamentStaffMemberModel: Model<TournamentStaffMember>,
    @InjectModel(TournamentStaffRole.name) private tournamentStaffRoleModel: Model<TournamentStaffRole>,
    @InjectModel(Mappool.name) private mappoolModel: Model<Mappool>,
    @InjectModel(MappoolSlot.name) private mappoolSlotModel: Model<MappoolSlot>,
    @InjectModel(MappoolSlotScoresheet.name) private mappoolSlotScoresheetModel: Model<MappoolSlotScoresheet>,
    @InjectModel(MappoolSlotScoresheetEntry.name) private mappoolSlotScoresheetEntryModel: Model<MappoolSlotScoresheetEntry>,
    @InjectModel(Beatmap.name) private tournamentBeatmapModel: Model<Beatmap>,
    @InjectModel(Scoresheet.name) private scoresheetModel: Model<Scoresheet>,
    @InjectModel(Score.name) private scoreModel: Model<Score>,
    @InjectModel(AppUser.name) private appUserModel: Model<AppUser>,
    private osuApiService: OsuApiService,
    private cloudinaryService: CloudinaryService,
    private discordService: DiscordService,) {}

  async createTournament(tournamentDto: TournamentDto, ownerId: number): Promise<Tournament> {
    const createdTournament = new this.tournamentModel(tournamentDto);
    createdTournament.acronym = createdTournament.acronym.toLowerCase();
    createdTournament.ownerId = ownerId;
    return createdTournament.save();
  }

  /*
  async getAllTournaments(): Promise<Tournament[]> {
    return this.tournamentModel.find().orFail();
  }
  */

  async getAllListedTournaments(): Promise<Tournament[]> {
    return this.tournamentModel.find({ $or: [{ unlisted: false }, { unlisted: { $exists: false } }]}).orFail();
  }

  async getTournamentHelper(acronym: string): Promise<HydratedDocument<Tournament>> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() })
      .orFail()
      .populate("rounds")
      .populate("players")
      .populate({ path: "teams", populate: "players" })
      .populate({ path: "staffMembers", populate: "roles" })
      .populate("staffRoles");
    // Separate db call to populate appUsers
    const osuPlayerIds = new Set([...tourney.players.map((player: TournamentPlayer) => player.playerId),
                                  ...tourney.staffMembers.map((staffMember: TournamentStaffMember) => staffMember.playerId)]);
    const appUsers = await this.appUserModel.find({ osuId: { $in: [...osuPlayerIds] } });
    const playerIdToAppUser = new Map<number, AppUser>(appUsers.map((appUser) => [appUser.osuId, appUser]));
    tourney.players.forEach((player: TournamentPlayer) => {
      player.appUser = playerIdToAppUser.get(player.playerId);
    });
    tourney.teams.forEach((team: TournamentTeam) => {
      team.players.forEach((player: TournamentPlayer) => {
        player.appUser = playerIdToAppUser.get(player.playerId);
      });
    });
    tourney.staffMembers.forEach((staffMember: TournamentStaffMember) => {
      staffMember.appUser = playerIdToAppUser.get(staffMember.playerId);
    });
    return tourney;
  }

  async getTournament(acronym: string): Promise<Tournament> {
    return this.getTournamentHelper(acronym);
  }

  async editTournament(acronym: string, tournamentDto: TournamentDto): Promise<Tournament> {
    const tourney = await this.getTournamentHelper(acronym);

    const progressChanged = tournamentDto.progress !== undefined && tourney.progress !== tournamentDto.progress;
    const nameChanged = tournamentDto.name !== undefined && tourney.name !== tournamentDto.name;
    const gameModeChanged = tournamentDto.gameMode !== undefined && tourney.gameMode !== tournamentDto.gameMode;
    const enableTeamsChanged = tournamentDto.enableTeams !== undefined && tourney.enableTeams !== tournamentDto.enableTeams;
    const isRegistrationSettingsChanged = tournamentDto.registrationSettings !== undefined && JSON.stringify(tourney.registrationSettings) !== JSON.stringify(tournamentDto.registrationSettings);
    const isDiscordSettingsChanged = tournamentDto.discordSettings !== undefined && JSON.stringify(tourney.discordSettings) !== JSON.stringify(tournamentDto.discordSettings);
    const bannerChanged = tournamentDto.bannerLink !== undefined && tourney.bannerLink !== tournamentDto.bannerLink;
    const descriptionChanged = tournamentDto.description !== undefined && tourney.description !== tournamentDto.description;
    const linksChanged = tournamentDto.links !== undefined && JSON.stringify(tourney.links) !== JSON.stringify(tournamentDto.links);
    const slotCategoriesChanged = tournamentDto.slotCategories !== undefined && JSON.stringify(tourney.slotCategories) !== JSON.stringify(tournamentDto.slotCategories);
    const otherSettingsChanged = nameChanged || gameModeChanged || enableTeamsChanged || isRegistrationSettingsChanged || isDiscordSettingsChanged || bannerChanged || descriptionChanged || linksChanged || slotCategoriesChanged;

    if (progressChanged) {
      if (otherSettingsChanged) throw new ProgressChangeConflictError();

      if ((tourney.progress === TournamentProgress.PLANNING && tournamentDto.progress !== TournamentProgress.REGISTRATION) ||
          (tourney.progress === TournamentProgress.REGISTRATION && tournamentDto.progress !== TournamentProgress.ONGOING) ||
          (tourney.progress === TournamentProgress.ONGOING && tournamentDto.progress !== TournamentProgress.CONCLUDED) ||
          (tourney.progress === TournamentProgress.CONCLUDED)) {
        throw new ProgressChangeError();
      }

      tourney.progress = tournamentDto.progress;
    } else {
      if ([TournamentProgress.REGISTRATION, TournamentProgress.ONGOING, TournamentProgress.CONCLUDED].includes(tourney.progress) &&
          (nameChanged || gameModeChanged || enableTeamsChanged)) {
        throw new ProgressLockedError();
      }

      if ([TournamentProgress.ONGOING, TournamentProgress.CONCLUDED].includes(tourney.progress) && isRegistrationSettingsChanged) {
        throw new ProgressLockedError();
      }

      if ([TournamentProgress.CONCLUDED].includes(tourney.progress) && (isDiscordSettingsChanged || bannerChanged || descriptionChanged || linksChanged || slotCategoriesChanged)) {
        throw new ProgressLockedError();
      }

      if (tourney.discordSettings.serverId !== tournamentDto.discordSettings?.serverId) {
        const exists = await this.tournamentModel.exists({ "discordSettings.serverId": tournamentDto.discordSettings?.serverId });
        if (exists) throw new DiscordServerAlreadyUsedError(tournamentDto.discordSettings?.serverId);
      }

      tourney.name = tournamentDto.name;
      tourney.gameMode = tournamentDto.gameMode;
      tourney.enableTeams = tournamentDto.enableTeams;
      tourney.registrationSettings = tournamentDto.registrationSettings;
      tourney.discordSettings = tournamentDto.discordSettings;
      tourney.bannerLink = tournamentDto.bannerLink;
      tourney.theme = tournamentDto.theme;
      tourney.description = tournamentDto.description;
      tourney.links = tournamentDto.links;
      tourney.slotCategories = tournamentDto.slotCategories;
      tourney.unlisted = tournamentDto.unlisted;
      tourney.allowTeamEditAfterRegistration = tournamentDto.allowTeamEditAfterRegistration;
    }

    await tourney.save();
    return tourney;
  }

  async uploadTourneyBanner(acronym: string, playerId: number, image: Express.Multer.File): Promise<Tournament> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail();

    var staffMemberUpload = false;
    if (tourney.ownerId === playerId) staffMemberUpload = true;
    else {
      const staffMember = tourney.staffMembers.find((staffMember) => staffMember.playerId === playerId);
      staffMemberUpload = staffMember?.roles.some(role => role.permissions.includes(`PATCH:/api/tournament/:acronym`));
    }
    if (staffMemberUpload && [TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();
    else if (!staffMemberUpload) throw new ForbiddenException();

    const imageUrl = await this.cloudinaryService.uploadImage(image, "banners", `${acronym.toLowerCase()}-banner`);
    tourney.bannerLink = imageUrl;

    await tourney.save();
    return tourney;
  }

  async uploadCategoryIcon(acronym: string, categoryName: string, playerId: number, image: Express.Multer.File): Promise<Tournament> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail();

    var staffMemberUpload = false;
    if (tourney.ownerId === playerId) staffMemberUpload = true;
    else {
      const staffMember = tourney.staffMembers.find((staffMember) => staffMember.playerId === playerId);
      staffMemberUpload = staffMember?.roles.some(role => role.permissions.includes(`PATCH:/api/tournament/:acronym`));
    }
    if (staffMemberUpload && [TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();
    else if (!staffMemberUpload) throw new ForbiddenException();

    const theCategoryIndex = tourney.slotCategories.findIndex((category) => category.name === categoryName);
    const theCategory = tourney.slotCategories[theCategoryIndex];
    if (theCategoryIndex === -1) throw new SlotCategoryNotFoundError(acronym, categoryName);

    const imageUrl = await this.cloudinaryService.uploadImage(image, "category-icons", `${acronym.toLowerCase()}-category-${categoryName.toLowerCase()}`);
    tourney.slotCategories[theCategoryIndex] = {...theCategory, iconLink: imageUrl};

    tourney.markModified("slotCategories");
    await tourney.save();
    return tourney;
  }

  async register(acronym: string, playerId: number): Promise<TournamentPlayer> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");

    if (tourney.progress !== TournamentProgress.REGISTRATION) throw new ProgressLockedError();

    if (Date.now() < new Date(tourney.registrationSettings.startDate).getTime() ||
        Date.now() > new Date(tourney.registrationSettings.endDate).getTime()) {
      throw new RegistrationClosedError();
    }

    return this.addPlayerHelper(tourney, playerId);
  }

  async unregister(acronym: string, playerId: number) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
      .populate("players")
      .populate({ path: "teams", populate: "players" });

    if (tourney.progress !== TournamentProgress.REGISTRATION) throw new ProgressLockedError();

    if (Date.now() < new Date(tourney.registrationSettings.startDate).getTime() ||
        Date.now() > new Date(tourney.registrationSettings.endDate).getTime()) {
      throw new RegistrationClosedError();
    }

    return this.removePlayerHelper(tourney, playerId);
  }

  async addPlayer(acronym: string, playerId: number, tournamentPlayerDto: TournamentPlayerDto): Promise<TournamentPlayer> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    return this.addPlayerHelper(tourney, playerId, true, tournamentPlayerDto);
  }

  async editPlayer(acronym: string, playerId: number, tournamentPlayerDto: TournamentPlayerDto): Promise<TournamentPlayer> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the player is registered in the tournament
    const player = tourney.players.find((x: TournamentPlayer) => x.playerId === playerId) as HydratedDocument<TournamentPlayer>;
    if (player === undefined) {
      throw new PlayerNotRegisteredError();
    }

    return await this.tournamentPlayerModel.findOneAndUpdate(
      { _id: player._id },
      {
        seed: tournamentPlayerDto.seed,
      },
      { new: true }).orFail();
  }

  async removePlayer(acronym: string, playerId: number) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
      .populate("players")
      .populate({ path: "teams", populate: "players" });

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    return this.removePlayerHelper(tourney, playerId, true);
  }

  async addPlayerHelper(tourney: HydratedDocument<Tournament>, playerId: number, isForced: boolean = false, tournamentPlayerDto?: TournamentPlayerDto): Promise<TournamentPlayer> {
    // Don't allow duplicate player
    if (tourney.players.find((x: TournamentPlayer) => x.playerId === playerId)) {
      throw new PlayerExistsError();
    }

    const appUser = await this.appUserModel.findOne({ osuId: playerId });
    const discordUserId = appUser?.discordId;
    if (!isForced && tourney.registrationSettings.enforceDiscord) {
      if (!discordUserId) throw new DiscordNotLinkedError();
      try {
        await this.discordService.verifyUserIsInServer(tourney.discordSettings.serverId, discordUserId);
      } catch (error) {
        if (error instanceof DiscordServerNotFoundError) {
          throw new DiscordServerNotSetupError();
        } else if (error instanceof DiscordMemberNotFoundError) {
          throw new NotADiscordMemberError();
        } else {
          throw error;
        }
      }
    }

    let tournamentPlayer : Partial<TournamentPlayerDto>;
    if (tourney.gameMode !== GameMode.ALL) {
      const osuUser = await this.osuApiService.getUser(playerId, tourney.gameMode);
      tournamentPlayer = {
        playerId: osuUser.id,
        username: osuUser.username,
        country: osuUser.country,
        seed: isForced ? tournamentPlayerDto?.seed : "",
      };
      tournamentPlayer[tourney.gameMode + 'Rank'] = osuUser.statistics.globalRank;
      tournamentPlayer[tourney.gameMode + 'PP'] = osuUser.statistics.pp;

      if (!isForced &&
          (tourney.registrationSettings.minRank !== 0 && osuUser.statistics.globalRank < tourney.registrationSettings.minRank) ||
          (tourney.registrationSettings.maxRank !== 0 && osuUser.statistics.globalRank > tourney.registrationSettings.maxRank)) {
        throw new RankRequirementNotMetError();
      }
    }
    // todo!
    else {
      throw new NotImplementedException();
    }

    const createdTournamentPlayer = new this.tournamentPlayerModel(tournamentPlayer);
    await createdTournamentPlayer.save();
    tourney.players.push(createdTournamentPlayer);
    await tourney.save();

    // Assign discord role if applicable
    let assignRoleStatus: Error|boolean = false;
    if (tourney.discordSettings.serverId && tourney.discordSettings.playerRoleId) {
      if (discordUserId) {
        try {
          await this.discordService.assignRole(tourney.discordSettings.serverId, discordUserId, tourney.discordSettings.playerRoleId);
          assignRoleStatus = true;
        } catch (error) {
          assignRoleStatus = error;
        }
      } else {
        assignRoleStatus = new DiscordNotLinkedError();
      }
    }
    if (tourney.discordSettings.logChannelId) {
      const title = isForced ? "Player Added" : "Player Registered";
      let description = `Username: \`${createdTournamentPlayer.username}\``;
      if (assignRoleStatus === true) {
        description += `\nRole auto-assigned successfully`;
      }
      else if (assignRoleStatus instanceof Error) {
        description += `\nRole auto-assignment failed: ${assignRoleStatus.message}`;
      }
      try {
        await this.discordService.log(tourney.discordSettings.serverId, tourney.discordSettings.logChannelId, title, description);
      } catch (error) {
        console.log(error);
      }
    }

    return createdTournamentPlayer;
  }

  async removePlayerHelper(tourney: HydratedDocument<Tournament>, playerId: number, isForced: boolean = false) {
    const index = tourney.players.findIndex((x: TournamentPlayer) => x.playerId === playerId);
    if (index < 0) {
      throw new PlayerNotRegisteredError();
    }

    const thePlayer = tourney.players[index];
    tourney.players.splice(index, 1);
    for (let team of tourney.teams) {
      const index2 = team.players.findIndex((x: TournamentPlayer) => x.playerId === playerId);
      if (index2 >= 0) {
        team.players.splice(index2, 1);
        await (team as HydratedDocument<TournamentTeam>).save();
      }
    }
    await tourney.save();

    // Unassign discord role if applicable
    let unassignRoleStatus: Error|boolean = false;
    if (tourney.discordSettings.serverId && tourney.discordSettings.playerRoleId) {
      const appUser = await this.appUserModel.findOne({ osuId: thePlayer.playerId });
      const discordUserId = appUser?.discordId;
      if (discordUserId) {
        try {
          await this.discordService.unassignRole(tourney.discordSettings.serverId, discordUserId, tourney.discordSettings.playerRoleId);
          unassignRoleStatus = true;
        } catch (error) {
          unassignRoleStatus = error;
        }
      } else {
        unassignRoleStatus = new DiscordNotLinkedError();
      }
    }
    if (tourney.discordSettings.logChannelId) {
      const title = isForced ? "Player Removed" : "Player Unregistered";
      let description = `Username: \`${thePlayer.username}\``;
      if (unassignRoleStatus === true) {
        description += `\nRole auto-unassigned successfully`;
      }
      else if (unassignRoleStatus instanceof Error) {
        description += `\nRole auto-unassignment failed: ${unassignRoleStatus.message}`;
      }
      try {
        await this.discordService.log(tourney.discordSettings.serverId, tourney.discordSettings.logChannelId, title, description);
      } catch (error) {
        console.log(error);
      }
    }
  }

  async refreshPlayer(acronym: string, playerId: number): Promise<TournamentPlayer> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");
    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();
    // todo!
    if (tourney.gameMode == GameMode.ALL) throw new NotImplementedException();

    const player = tourney.players.find((x: TournamentPlayer) => x.playerId === playerId) as HydratedDocument<TournamentPlayer>;
    if (!player) throw new PlayerNotRegisteredError();

    const osuUser = await this.osuApiService.getUser(playerId, tourney.gameMode);
    const fields: any = {
      username: osuUser.username,
      country: osuUser.country,
    };
    fields[`${tourney.gameMode}Rank`] = osuUser.statistics.globalRank;
    fields[`${tourney.gameMode}PP`] = osuUser.statistics.pp;

    player.username = fields.username;
    player.country = fields.country;
    player[`${tourney.gameMode}Rank`] = fields[`${tourney.gameMode}Rank`];
    player[`${tourney.gameMode}PP`] = fields[`${tourney.gameMode}PP`];
    return await player.save();
  }

  async refreshPlayers(acronym: string) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");
    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();
    // todo!
    if (tourney.gameMode == GameMode.ALL) throw new NotImplementedException();

    const playerMap = new Map<number, TournamentPlayer>(tourney.players.map((player) => [player.playerId, player]));
    const failedUsernames: string[] = [];
    for (let i = 0; i < tourney.players.length; i += 50) {
      const batchPlayers = tourney.players.slice(i, i + 50);
      const playerIds = batchPlayers.map((p) => p.playerId);

      let osuUsers: OsuUserDto[];
      try {
        osuUsers = await this.osuApiService.getUsers(playerIds, tourney.gameMode);
      } catch (err) {
        failedUsernames.push(...batchPlayers.map(player => player.username));
        continue;
      }
      const returnedIds = new Set(osuUsers.map(user => user.id));
      for (const player of batchPlayers) {
        if (!returnedIds.has(player.playerId)) {
          failedUsernames.push(player.username);
        }
      }

      const documentsToUpdate: { id: ObjectId, fields: any, username: string }[] = [];
      for (const osuUser of osuUsers) {
        const player = playerMap.get(osuUser.id);
        if (!player) continue;

        const fields: any = {
          username: osuUser.username,
          country: osuUser.country,
        };
        fields[`${tourney.gameMode}Rank`] = osuUser.statistics.globalRank;
        fields[`${tourney.gameMode}PP`] = osuUser.statistics.pp;

        player.username = fields.username;
        player.country = fields.country;
        player[`${tourney.gameMode}Rank`] = fields[`${tourney.gameMode}Rank`];
        player[`${tourney.gameMode}PP`] = fields[`${tourney.gameMode}PP`];

        documentsToUpdate.push({ id: (player as any)._id, fields, username: player.username });
      }
      
      const ops = documentsToUpdate.map(document => ({
        updateOne: {
          filter: { _id: document.id },
          update: { $set: document.fields },
        }
      }));

      try {
        await this.tournamentPlayerModel.bulkWrite(ops, { ordered: false });
      } catch (error) {
        if (error && error.writeErrors && Array.isArray(error.writeErrors)) {
          for (const writeError of error.writeErrors) {
            const index = writeError.index;
            const failed = documentsToUpdate[index];
            if (failed) failedUsernames.push(failed.username);
          }
        } else {
          console.log("Unexpected error: ", error);
          throw error;
        }
      }
    }
    if (failedUsernames.length > 0) {
      throw new RefreshPlayersPartialFailure(failedUsernames);
    }
  }

  async createTeam(acronym: string, tournamentTeamDto: TournamentTeamDto, captainId: number): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players").populate("teams");

    if (tourney.progress !== TournamentProgress.REGISTRATION) throw new ProgressLockedError();

    /*
    if (Date.now() < new Date(tourney.registrationSettings.startDate).getTime() ||
        Date.now() > new Date(tourney.registrationSettings.endDate).getTime()) {
      throw new RegistrationClosedError();
    }
    */

    // Assert that the captain is the first player
    if (tournamentTeamDto.players[0].playerId !== captainId) {
      throw new TeamCaptainError();
    }
    
    // Assert that the captain is not already a captain of another team
    for (let team of tourney.teams) {
      if (team.players[0].playerId === captainId) {
        throw new TeamCaptainExistsError();
      }
    }

    // Auto set captain to confirmed and everyone else to unconfirmed
    /*
    const confirmedStatus = new Map<number, boolean>();
    for (let i = 0; i < tournamentTeamDto.players.length; i++) {
      const tourneyPlayer = tournamentTeamDto.players[i];
      if (i === 0) confirmedStatus.set(tourneyPlayer.playerId, true);
      else confirmedStatus.set(tourneyPlayer.playerId, false);
    }
    const tournamentTeamDtoClone: TournamentTeamDto = {
      ...tournamentTeamDto,
      confirmedStatus,
    }
    */

    return this.createTeamHelper(tourney, tournamentTeamDto);
  }

  async addTeam(acronym: string, tournamentTeamDto: TournamentTeamDto): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players").populate("teams");
    return this.createTeamHelper(tourney, tournamentTeamDto);
  }

  async createTeamHelper(tourney: HydratedDocument<Tournament>, tournamentTeamDto: TournamentTeamDto): Promise<TournamentTeam> {
    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that there is at least one player
    if (tournamentTeamDto.players.length === 0) {
      throw new TeamMissingPlayersError();
    }

    // Assert that the players are registered
    const registeredPlayerIds = tourney.players.map((player: HydratedDocument<TournamentPlayer>) => player._id.toString());
    if (tournamentTeamDto.players.some(player => !registeredPlayerIds.includes(player._id))) {
      throw new PlayerNotRegisteredError();
    }

    // Don't allow duplicate team
    if (tourney.teams.find((x: TournamentTeam) => x.name === tournamentTeamDto.name)) {
      throw new TeamExistsError();
    }

    const createdTournamentTeam = new this.tournamentTeamModel(tournamentTeamDto);
    await createdTournamentTeam.save();
    tourney.teams.push(createdTournamentTeam);
    await tourney.save();
    await createdTournamentTeam.populate("players");
    return createdTournamentTeam;
  }

  async editTeam(acronym: string, teamId: Types.ObjectId, tournamentTeamDto: TournamentTeamDto): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players").populate("teams");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the team is associated with the tourney
    const theTeam2 = tourney.teams.find((team: HydratedDocument<TournamentTeam>) => `${team._id}` === `${teamId}`);
    if (theTeam2 === undefined) throw new TeamNotFoundError();

    // Assert that there is at least one player
    if (tournamentTeamDto.players.length === 0) {
      throw new TeamMissingPlayersError();
    }

    // Assert that the players are registered
    const registeredPlayerIds = tourney.players.map((player: HydratedDocument<TournamentPlayer>) => player._id.toString());
    if (tournamentTeamDto.players.some(player => !registeredPlayerIds.includes(player._id))) {
      throw new PlayerNotRegisteredError();
    }

    // Don't allow duplicate team
    if (tourney.teams.find((team: HydratedDocument<TournamentTeam>) => team.name === tournamentTeamDto.name && !team._id.equals(teamId))) {
      throw new TeamExistsError();
    }

    return await this.tournamentTeamModel.findOneAndUpdate(
      { _id: teamId },
      {
        name: tournamentTeamDto.name,
        imageLink: tournamentTeamDto.imageLink,
        players: tournamentTeamDto.players,
        seed: tournamentTeamDto.seed,
      },
      { new: true }).orFail().populate("players");
  }

  async removeTeam(acronym: string, teamId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("teams").populate({ path: "rounds", populate: { path: "matches" } });

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    tourney.teams = [...tourney.teams.filter((team: HydratedDocument<TournamentTeam>) => !team._id.equals(teamId))];
    await tourney.save();

    // remove from matches as well
    for (let round of tourney.rounds) {
      for (let match of round.matches) {
        // playerOrTeam is an ObjectId here
        match.participants = match.participants.filter((participant) => participant.playerOrTeam.toString() !== teamId.toString());
        await (match as HydratedDocument<TournamentMatch>).save();
      }
    }
  }

  /*
  async acceptTeamInvite(acronym: string, teamId: Types.ObjectId, playerId: number): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players").populate("teams");

    // Assert that the player is not already confirmed for another team
    for (let team of tourney.teams) {
      if (!!team.confirmedStatus.get(playerId)) {
        throw new TeamAlreadyAcceptedError();
      }
    }

    const theTeam = await this.tournamentTeamModel.findOne({_id: teamId}).orFail();

    // Assert that the player is in this team
    if (!theTeam.players.find(player => player.playerId === playerId)) {
      throw new TeamMismatchError();
    }

    theTeam.confirmedStatus.set(playerId, true);
    theTeam.save();
    return theTeam;
  }
  */

  async editTeamName(acronym: string, teamId: Types.ObjectId, playerId: number, editTeamNameDto: EditTeamNameDto): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("teams");
    const theTeam = await this.tournamentTeamModel.findOne({_id: teamId}).orFail().populate("players");

    // Only allow team captain during registration to upload
    if (tourney.progress !== TournamentProgress.REGISTRATION && !tourney.allowTeamEditAfterRegistration) throw new ProgressLockedError();
    if (theTeam.players[0].playerId !== playerId) throw new NotTeamCaptainError();

    // Assert that the team is associated with the tourney
    const theTeam2 = tourney.teams.find((team: HydratedDocument<TournamentTeam>) => `${team._id}` === `${teamId}`);
    if (theTeam2 === undefined) throw new TeamNotFoundError();

    theTeam.name = editTeamNameDto.name;
    await theTeam.save();
    return theTeam;
  }

  async uploadTeamImage(acronym: string, teamId: Types.ObjectId, playerId: number, image: Express.Multer.File): Promise<TournamentTeam> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("teams");
    const theTeam = await this.tournamentTeamModel.findOne({_id: teamId}).orFail().populate("players");

    var staffMemberUpload = false;
    if (tourney.ownerId === playerId) staffMemberUpload = true;
    else {
      const staffMember = tourney.staffMembers.find((staffMember) => staffMember.playerId === playerId);
      staffMemberUpload = staffMember?.roles.some(role => role.permissions.includes(`PATCH:/api/tournament/:acronym/team/:teamId`));
    }
    if (staffMemberUpload && [TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // If not a staff member upload, only allow team captain during registration to upload
    if (!staffMemberUpload && tourney.progress !== TournamentProgress.REGISTRATION && !tourney.allowTeamEditAfterRegistration) throw new ProgressLockedError();
    if (!staffMemberUpload && theTeam.players[0].playerId !== playerId) throw new NotTeamCaptainError();

    // Assert that the team is associated with the tourney
    const theTeam2 = tourney.teams.find((team: HydratedDocument<TournamentTeam>) => `${team._id}` === `${teamId}`);
    if (theTeam2 === undefined) throw new TeamNotFoundError();

    const imageUrl = await this.cloudinaryService.uploadImage(image, "team-images", teamId.toString());
    theTeam.imageLink = imageUrl;

    await theTeam.save();
    return theTeam;
  }

  async batchAssignPlayerSeeds(acronym: string, seedAssignments: { playerId: number, seed: string }[]) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("players");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    const promisesToSave: Promise<{ name: string, error?: any }>[] = [];
    for (const assignment of seedAssignments) {
      const player = tourney.players.find((player: HydratedDocument<TournamentPlayer>) => player.playerId === assignment.playerId) as HydratedDocument<TournamentPlayer>;
      if (player === undefined) continue;
      player.seed = assignment.seed;
      promisesToSave.push(player.save().then(() => ({ name: player.username }), (error) => ({ name: player.username, error })));
    }
    const results = await Promise.allSettled(promisesToSave);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    for (const failure of failures) {
      console.error(failure.reason);
    }

    return tourney;
  }

  async batchAssignTeamSeeds(acronym: string, seedAssignments: { teamId: string, seed: string }[]) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("teams");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    const promisesToSave: Promise<{ name: string, error?: any }>[] = [];
    for (const assignment of seedAssignments) {
      const team = tourney.teams.find((team: HydratedDocument<TournamentTeam>) => `${team._id}` === `${assignment.teamId}`) as HydratedDocument<TournamentTeam>;
      if (team === undefined) continue;
      team.seed = assignment.seed;
      promisesToSave.push(team.save().then(() => ({ name: team.name }), (error) => ({ name: team.name, error })));
    }
    const results = await Promise.allSettled(promisesToSave);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    for (const failure of failures) {
      console.error(failure.reason);
    }

    return tourney;
  }

  async addStaffMember(acronym: string, playerId: number, tournamentStaffMemberDto: TournamentStaffMemberDto): Promise<TournamentStaffMember> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffMembers");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    const osuUser = await this.osuApiService.getUser(playerId, tourney.gameMode);
    const tournamentStaffMember: Partial<TournamentStaffMemberDto> = {
      playerId: osuUser.id,
      username: osuUser.username,
      country: osuUser.country,
      roles: tournamentStaffMemberDto.roles,
    };

    // Don't allow duplicate staff member
    if (tourney.staffMembers.find((x: TournamentStaffMember) => x.playerId === tournamentStaffMember.playerId)) {
      throw new StaffMemberExistsError();
    }

    const createdTournamentStaffMember = new this.tournamentStaffMemberModel(tournamentStaffMember);
    await createdTournamentStaffMember.save();
    tourney.staffMembers.push(createdTournamentStaffMember);
    await tourney.save();
    return createdTournamentStaffMember;
  }

  async editStaffMember(acronym: string, playerId: number, tournamentStaffMemberDto: TournamentStaffMemberDto): Promise<TournamentStaffMember> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffMembers");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    // Assert that the member is associated with the tourney
    const staffMember = tourney.staffMembers.find((member: TournamentStaffMember) => `${member.playerId}` === `${playerId}`) as HydratedDocument<TournamentStaffMember>;
    if (staffMember === undefined) throw new StaffMemberNotFoundError();

    // Do not update player ID or username
    return await this.tournamentStaffMemberModel.findOneAndUpdate(
      { _id: staffMember._id },
      {
        roles: tournamentStaffMemberDto.roles,
      },
      { new: true }).orFail();
  }

  async removeStaffMember(acronym: string, playerId: number) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffMembers");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    const index = tourney.staffMembers.findIndex((x: TournamentStaffMember) => x.playerId === playerId);
    if (index === -1) throw new StaffMemberNotFoundError();
    tourney.staffMembers.splice(index, 1);

    // remove from matches as well
    await tourney.populate({ path: "rounds", populate: { path: "matches", populate: ["referees", "streamers", "commentators"] } });
    for (let round of tourney.rounds) {
      for (let match of round.matches) {
        let modified = false;
        const refereeIndex = match.referees.findIndex(ref => `${ref.playerId}` === `${playerId}`);
        if (refereeIndex >= 0) {
          match.referees.splice(refereeIndex, 1);
          modified = true;
        }
        const streamerIndex = match.streamers.findIndex(ref => `${ref.playerId}` === `${playerId}`);
        if (streamerIndex >= 0) {
          match.streamers.splice(streamerIndex, 1);
          modified = true;
        }
        const commentatorIndex = match.commentators.findIndex(ref => `${ref.playerId}` === `${playerId}`);
        if (commentatorIndex >= 0) {
          match.commentators.splice(commentatorIndex, 1);
          modified = true;
        }
        if (modified) await (match as HydratedDocument<TournamentMatch>).save();
      }
    }

    await tourney.save();
  }

  async addStaffRole(acronym: string, tournamentStaffRoleDto: TournamentStaffRoleDto): Promise<TournamentStaffRole> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffRoles");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    // Don't allow duplicate role name
    if (tourney.staffRoles.find((x: TournamentStaffRole) => x.name === tournamentStaffRoleDto.name)) {
      throw new StaffRoleExistsError();
    }

    const createdRole = new this.tournamentStaffRoleModel(tournamentStaffRoleDto);
    await createdRole.save();
    tourney.staffRoles.push(createdRole);
    await tourney.save();
    return createdRole;
  }

  async editStaffRole(acronym: string, roleId: Types.ObjectId, tournamentStaffRoleDto: TournamentStaffRoleDto): Promise<TournamentStaffRole> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffRoles");

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    // Assert that the role is associated with the tourney
    const role = tourney.staffRoles.find((role: HydratedDocument<TournamentStaffRole>) => `${role._id}` === `${roleId}`);
    if (role === undefined) throw new StaffRoleNotFoundError();
    
    // Don't allow duplicate role name
    if (tourney.staffRoles.find((x: HydratedDocument<TournamentStaffRole>) => x.name === tournamentStaffRoleDto.name && !x._id.equals(roleId))) {
      throw new StaffRoleExistsError();
    }

    return await this.tournamentStaffRoleModel.findOneAndUpdate(
      { _id: roleId },
      {
        name: tournamentStaffRoleDto.name,
        permissions: tournamentStaffRoleDto.permissions,
      },
      { new: true }).orFail();
  }

  async removeStaffRole(acronym: string, roleId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
        .populate({ path: "staffMembers", populate: { path: "roles" } }).populate({ path: "staffRoles" });

    if (tourney.progress === TournamentProgress.CONCLUDED) throw new ProgressLockedError();

    const index = tourney.staffRoles.findIndex((role: HydratedDocument<TournamentStaffRole>) => `${role._id}` === `${roleId}`);
    if (index === -1) throw new StaffRoleNotFoundError();
    tourney.staffRoles.splice(index, 1);

    // remove from staff members as well
    for (let staffMember of tourney.staffMembers) {
      const index2 = staffMember.roles.findIndex((role: HydratedDocument<TournamentStaffRole>) => `${role._id}` === `${roleId}`);
      if (index2 >= 0) {
        staffMember.roles.splice(index2, 1);
        await (staffMember as HydratedDocument<TournamentStaffMember>).save();
      }
    }

    await tourney.save();
  }

  async getAllMatches(acronym: string): Promise<TournamentMatch[]> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate({
      path: "rounds",
      populate: {
        path: "matches",
        populate: [
          { path: "referees", populate: "roles" },
          { path: "streamers", populate: "roles" },
          { path: "commentators", populate: "roles" }
        ]
      }
    });
    return tourney.rounds.reduce((acc, round) => acc.concat(round.matches), []);
  }

  async createTournamentRound(acronym: string, tournamentRoundDto: TournamentRoundDto): Promise<TournamentRound> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail();

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    const newRoundId = new mongoose.Types.ObjectId();
    const newMappoolId = new mongoose.Types.ObjectId();
    const newScoresheetId = new mongoose.Types.ObjectId();

    const createdRound = new this.tournamentRoundModel({ ...tournamentRoundDto, _id: newRoundId, mappool: newMappoolId, scoresheet: newScoresheetId });
    const createdMappool = new this.mappoolModel({ _id: newMappoolId, tournamentRound: newRoundId, downloadUrl: tournamentRoundDto.mappoolDownloadUrl });
    const createdScoresheet = new this.scoresheetModel({ _id: newScoresheetId, mappool: newMappoolId, ownerId: tourney.ownerId });

    await Promise.all([createdRound.save(), createdMappool.save(), createdScoresheet.save()]);
    tourney.rounds.push(createdRound);
    await tourney.save();
    return createdRound;
  }

  async getTournamentRound(acronym: string, roundId: Types.ObjectId, caller: AppUser): Promise<TournamentRound> {
    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail()
      .populate({ path: "matches", populate: [{ path: "referees", populate: "roles" },
                                              { path: "streamers", populate: "roles" },
                                              { path: "commentators", populate: "roles" }] });
    //console.log(tourneyRound.scoresheet.slotScoresheets);

    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
      .populate({ path: "staffMembers", populate: "roles" })
      .populate("staffRoles");
    
    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();
    
    //const staffMember = tourney.staffMembers.find((staffMember) => staffMember.playerId === caller.osuId);
    //const canViewWipMappool = staffMember?.roles.some(role => role.permissions.includes(`GET:/api/tournament/:acronym/mappool/:mappoolId`));

    if (!tourneyRound.mappoolWip) {
      await tourneyRound.populate({ path: "mappool", populate: { path: "slots", populate: { path: "beatmap" } } });
    }

    if (!tourneyRound.scoresheetWip) {
      await tourneyRound.populate(
        { path: "scoresheet", populate:
          { path: "slotScoresheets", populate: [
            { path: "slot" },
            { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
            { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
      ]}});
    }

    // Conditional populate round.matches.participants.playerOrTeam based on round.matches.isTeamMatch
    const matchPopulatePromises = tourneyRound.matches.map(match => {
      const hydratedMatch = match as HydratedDocument<TournamentMatch>;
      if (hydratedMatch.isTeamMatch) {
        return Promise.all([
          hydratedMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } }),
          hydratedMatch.populate({ path: "conditionals", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } })
        ]);
      } else {
        return Promise.all([
          hydratedMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } }),
          hydratedMatch.populate({ path: "conditionals", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } })
        ]);
      }
    });
    await Promise.all(matchPopulatePromises);

    return tourneyRound;
  }

  async editTournamentRound(acronym: string, roundId: Types.ObjectId, tournamentRoundDto: TournamentRoundDto): Promise<TournamentRound> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    if (tournamentRoundDto.mappoolDownloadUrl !== round.mappool.downloadUrl) {
      await (round as HydratedDocument<TournamentRound>).populate("mappool");
      round.mappool.downloadUrl = tournamentRoundDto.mappoolDownloadUrl;
      await (round.mappool as HydratedDocument<Mappool>).save();
    }

    round.name = tournamentRoundDto.name;
    round.startDate = tournamentRoundDto.startDate;
    round.mappoolWip = tournamentRoundDto.mappoolWip;
    round.scoresheetWip = tournamentRoundDto.scoresheetWip;
    await (round as HydratedDocument<TournamentRound>).save();
    return round;
  }

  async removeTournamentRound(acronym: string, roundId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    tourney.rounds = [...tourney.rounds.filter((round: HydratedDocument<TournamentRound>) => `${round._id}` !== `${roundId}`)];
    await tourney.save();
  }

  async getTournamentMappool(mappoolId: Types.ObjectId): Promise<Mappool> {
    return await this.mappoolModel.findOne({ _id: mappoolId }).orFail()
      .populate({ path: "slots", populate: { path: "beatmap" } });
  }

  async getTournamentScoresheet(scoresheetId: Types.ObjectId): Promise<Scoresheet> {
    return await this.scoresheetModel.findOne({ _id: scoresheetId }).orFail()
      .populate(
          { path: "slotScoresheets", populate: [
            { path: "slot" },
            { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
            { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
      ]});
  }

  async addMappoolSlot(acronym: string, roundId: Types.ObjectId, mappoolSlotDto: MappoolSlotDto): Promise<MappoolSlot> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate({ path: "mappool", populate: { path: "slots" } });

    // Don't allow duplicate slot label
    if (tourneyRound.mappool.slots.find((x: MappoolSlot) => x.label === mappoolSlotDto.label)) {
      throw new MappoolSlotExistsError();
    }

    const createdBeatmap = await this.createTournamentBeatmap(mappoolSlotDto.beatmap.beatmapId);

    const filledSlotDto = {
      ...mappoolSlotDto,
      beatmap: createdBeatmap,
    };

    if (mappoolSlotDto.requiredMods.length > 0) {
      const gameMode = mappoolSlotDto.gameMode ?? tourney.gameMode;
      const mods = mappoolSlotDto.requiredMods.map(mod => mod.acronym); // todo: figure out lazer mods
      const difficultyAttributes = await this.osuApiService.getBeatmapDifficultyAttributes(mappoolSlotDto.beatmap.beatmapId, mods, gameMode);
      filledSlotDto.adjustedStarRating = difficultyAttributes["starRating"];
    }

    //console.log(filledPickDto);
    const createdSlot = new this.mappoolSlotModel(filledSlotDto);
    await createdSlot.save();

    tourneyRound.mappool.slots = [...tourneyRound.mappool.slots, createdSlot];
    (tourneyRound.mappool as HydratedDocument<Mappool>).save();
    return createdSlot;
  }

  async editMappoolSlot(acronym: string, roundId: Types.ObjectId, slotId: Types.ObjectId, mappoolSlotDto: MappoolSlotDto): Promise<MappoolSlot> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate({ path: "mappool", populate: { path: "slots" } });
    const mappoolSlot = await this.mappoolSlotModel.findOne({ _id: slotId }).orFail().populate("beatmap");

    // Don't allow duplicate slot label
    if (tourneyRound.mappool.slots.find((x: HydratedDocument<MappoolSlot>) => x.label === mappoolSlotDto.label && !x._id.equals(slotId))) {
      throw new MappoolSlotExistsError();
    }

    if (mappoolSlotDto.beatmap.beatmapId !== mappoolSlot.beatmap.beatmapId) {
      const createdBeatmap = await this.createTournamentBeatmap(mappoolSlotDto.beatmap.beatmapId);
      mappoolSlot.beatmap = createdBeatmap;
    }

    if (mappoolSlotDto.requiredMods.length === 0) {
      mappoolSlot.adjustedStarRating = undefined;
    }
    else if (JSON.stringify(mappoolSlot.requiredMods) !== JSON.stringify(mappoolSlotDto.requiredMods)) {
      const gameMode = mappoolSlotDto.gameMode ?? tourney.gameMode;
      const mods = mappoolSlotDto.requiredMods.map(mod => mod.acronym); // todo: figure out lazer mods
      const difficultyAttributes = await this.osuApiService.getBeatmapDifficultyAttributes(mappoolSlotDto.beatmap.beatmapId, mods, gameMode);
      mappoolSlot.adjustedStarRating = difficultyAttributes["starRating"];
    }

    mappoolSlot.label = mappoolSlotDto.label;
    mappoolSlot.category = mappoolSlotDto.category || "";
    mappoolSlot.requiredMods = (mappoolSlotDto.requiredMods as ScoreMod[]) || [];
    mappoolSlot.gameMode = mappoolSlotDto.gameMode || undefined;
    await mappoolSlot.save();
    return mappoolSlot;
  }

  async removeMappoolSlot(acronym: string, roundId: Types.ObjectId, slotId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail()
        .populate({ path: "mappool", populate: { path: "slots" } })
        .populate({ path: "scoresheet", populate: { path: "slotScoresheets", populate: { path: "slot" } } });
    const slotIndex = tourneyRound.mappool.slots.findIndex((x: HydratedDocument<MappoolSlot>) => x._id.equals(slotId));
    if (slotIndex === -1) throw new MappoolSlotNotFoundError();
    tourneyRound.mappool.slots.splice(slotIndex, 1);
    await (tourneyRound.mappool as HydratedDocument<Mappool>).save();

    // remove from scoreseheet as well
    const scoresheet = tourneyRound.scoresheet as HydratedDocument<Scoresheet>;
    const slotScoresheetIndex = scoresheet.slotScoresheets.findIndex((x: HydratedDocument<MappoolSlotScoresheet>) => (x.slot as HydratedDocument<MappoolSlot>)._id.equals(slotId));
    if (slotScoresheetIndex !== -1) {
      scoresheet.slotScoresheets.splice(slotScoresheetIndex, 1);
      await scoresheet.save();
    }
  }

  async createTournamentBeatmap(beatmapId: number): Promise<Beatmap> {
    const osuBeatmap = await this.osuApiService.getBeatmap(beatmapId);
    const tournamentBeatmap: Beatmap = {
      beatmapId: osuBeatmap.id,
      beatmapSetId: osuBeatmap.beatmapsetId,
      title: osuBeatmap.beatmapset.title,
      artist: osuBeatmap.beatmapset.artist,
      source: osuBeatmap.beatmapset.source,
      difficultyName: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      mappers: osuBeatmap.owners.map(owner => owner.username),
      gameMode: osuBeatmap.mode as GameMode,
      starRating: osuBeatmap.difficultyRating,
      length: osuBeatmap.hitLength,
      bpm: osuBeatmap.bpm,
      cs: osuBeatmap.cs,
      hp: osuBeatmap.drain,
      od: osuBeatmap.accuracy,
      ar: osuBeatmap.ar,
      lastUpdated: osuBeatmap.lastUpdated,
    };

    const createdBeatmap = new this.tournamentBeatmapModel(tournamentBeatmap);
    await createdBeatmap.save();
    return createdBeatmap;
  }

  /*
  async addTournamentLobby(acronym: string, roundId: Types.ObjectId, tournamentLobbyDto: TournamentLobbyDto): Promise<TournamentLobby> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    // The type doesn't have the _id property for some reason so I'm casting to any
    const round = tourney.rounds.find((round: any) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TourneyMismatchError();

    // Assert that the players and teams are registered
    // The type doesn't have the _id property for some reason so I'm casting to any
    const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
    if (tournamentLobbyDto.players.some((player: any) => !registeredPlayerIds.includes(player._id))) {
      throw new PlayerNotRegisteredError();
    }
    const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
    if (tournamentLobbyDto.teams.some((team: any) => !registeredTeamIds.includes(team._id))) {
      throw new TeamNotRegisteredError();
    }

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail();

    // Don't allow duplicate lobby ID
    if (tourneyRound.lobbies.find((x: any) => x.id === tournamentLobbyDto.id)) {
      throw new LobbyExistsError();
    }

    const createdLobby = new this.tournamentLobbyModel(tournamentLobbyDto);
    await createdLobby.save();
    tourneyRound.lobbies.push(createdLobby);
    await tourneyRound.save();

    for (let matchId of tournamentLobbyDto.matchIds) {
      await this.submitMatch(acronym, roundId, matchId);
    }

    return createdLobby;
  }

  async editTournamentLobby(acronym: string, roundId: Types.ObjectId, lobbyId: Types.ObjectId, tournamentLobbyDto: TournamentLobbyDto): Promise<TournamentLobby> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    // The type doesn't have the _id property for some reason so I'm casting to any
    const round = tourney.rounds.find((round: any) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TourneyMismatchError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("picks");
    const tourneyLobby = await this.tournamentLobbyModel.findOne({ _id: lobbyId }).orFail().populate("players").populate("teams");

    // Assert that the players and teams are registered
    // The type doesn't have the _id property for some reason so I'm casting to any
    const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
    if (tournamentLobbyDto.players.some((player: any) => !registeredPlayerIds.includes(player._id))) {
      throw new PlayerNotRegisteredError();
    }
    const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
    if (tournamentLobbyDto.teams.some((team: any) => !registeredTeamIds.includes(team._id))) {
      throw new TeamNotRegisteredError();
    }

    // Don't allow duplicate lobby ID
    if (tourneyRound.lobbies.find((x: any) => x.id === tournamentLobbyDto.id && !x._id.equals(lobbyId))) {
      throw new LobbyExistsError();
    }

    for (let matchId of tournamentLobbyDto.matchIds) {
      if (!tourneyLobby.matchIds.includes(matchId)) {
        await this.submitMatch(acronym, roundId, matchId);
      }
    }

    tourneyLobby.id = tournamentLobbyDto.id;
    tourneyLobby.time = tournamentLobbyDto.time;
    tourneyLobby.players = tournamentLobbyDto.players as TournamentPlayer[];
    tourneyLobby.teams = tournamentLobbyDto.teams as TournamentTeam[];
    tourneyLobby.matchIds = tournamentLobbyDto.matchIds;

    await tourneyLobby.save();
    return tourneyLobby;
  }
  */

  async addTournamentMatch(acronym: string, roundId: Types.ObjectId, tournamentMatchDto: TournamentMatchDto): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds").populate("staffMembers");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    // Assert that the players and teams are registered
    // The type doesn't have the _id property for some reason so I'm casting to any
    /*
    if (tourney.isTeamTourney) {
      const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
      if (!tournamentMatchDto.teams.every((team: any) => registeredTeamIds.includes(team._id))) {
        throw new TeamNotRegisteredError();
      }
    } else {
      const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
      if (!tournamentMatchDto.players.every((player: any) => registeredPlayerIds.includes(player._id))) {
        throw new PlayerNotRegisteredError();
      }
    }
    */

    // Assert that the players/teams are valid
    if (tournamentMatchDto.isTeamMatch) {
      const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
      if (!tournamentMatchDto.participants.every((participant: TournamentMatchParticipant) => registeredTeamIds.includes(participant.playerOrTeam))) {
        throw new TeamNotFoundError();
      }
    } else {
      const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
      if (!tournamentMatchDto.participants.every((participant: TournamentMatchParticipant) => registeredPlayerIds.includes(participant.playerOrTeam))) {
        throw new PlayerNotRegisteredError();
      }
    }
    
    // Assert that all the staff members are valid
    for (let matchStaff of tournamentMatchDto.referees.concat(tournamentMatchDto.streamers, tournamentMatchDto.commentators)) {
      // Assert that the member is associated with the tourney
      const staffMember = tourney.staffMembers.find((member: HydratedDocument<TournamentStaffMember>) => `${member._id}` === `${matchStaff._id}`);
      if (staffMember === undefined) throw new StaffMemberNotFoundError();
    }

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail();

    // Don't allow duplicate match ID
    if (tourneyRound.matches.find((x: HydratedDocument<TournamentMatch>) => x.id === tournamentMatchDto.id)) {
      throw new MatchExistsError();
    }

    const createdMatch = new this.tournamentMatchModel(tournamentMatchDto);
    await createdMatch.save();
    tourneyRound.matches.push(createdMatch);
    await tourneyRound.save();

    for (let matchId of tournamentMatchDto.matchIds) {
      await this.processMatch(acronym, roundId, matchId);
    }

    return createdMatch;
  }

  async editTournamentMatch(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId, tournamentMatchDto: TournamentMatchDto): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate({ path: "mappool", populate: { path: "slots" } });
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail().populate("referees").populate("streamers").populate("commentators");

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${matchId}`);
    if (match === undefined) throw new MatchNotFoundError();

    // Assert that the players and teams are registered
    // The type doesn't have the _id property for some reason so I'm casting to any
    /*
    if (tourney.isTeamTourney) {
      const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
      if (!tournamentMatchDto.teams.every((team: any) => registeredTeamIds.includes(team._id))) {
        throw new TeamNotRegisteredError();
      }
    } else {
      const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
      if (!tournamentMatchDto.players.every((player: any) => registeredPlayerIds.includes(player._id))) {
        throw new PlayerNotRegisteredError();
      }
    }
    */

    // Assert that the players/teams are valid
    if (tournamentMatchDto.isTeamMatch) {
      const registeredTeamIds = tourney.teams.map((team: any) => team._id.toString());
      if (!tournamentMatchDto.participants.every((participant: TournamentMatchParticipant) => registeredTeamIds.includes(participant.playerOrTeam))) {
        throw new TeamNotFoundError();
      }
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      const registeredPlayerIds = tourney.players.map((player: any) => player._id.toString());
      if (!tournamentMatchDto.participants.every((participant: TournamentMatchParticipant) => registeredPlayerIds.includes(participant.playerOrTeam))) {
        throw new PlayerNotRegisteredError();
      }
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }

    // Assert that all the staff members are valid
    for (let matchStaff of tournamentMatchDto.referees.concat(tournamentMatchDto.streamers, tournamentMatchDto.commentators)) {
      // Assert that the member is associated with the tourney
      const staffMember = tourney.staffMembers.find((member: TournamentStaffMember) => `${member.playerId}` === `${matchStaff.playerId}`);
      if (staffMember === undefined) throw new StaffMemberNotFoundError();
    }

    // Don't allow duplicate match ID
    if (tourneyRound.matches.find((x: HydratedDocument<TournamentMatch>) => x.id === tournamentMatchDto.id && !x._id.equals(matchId))) {
      throw new MatchExistsError();
    }

    // skip submit
    /*
    for (let matchId of tournamentMatchDto.matchIds) {
      if (!tourneyMatch.matchIds.includes(matchId)) {
        await this.processMatch(acronym, roundId, matchId);
      }
    }
    */

    tourneyMatch.id = tournamentMatchDto.id;
    tourneyMatch.time = tournamentMatchDto.time;
    tourneyMatch.isTeamMatch = tournamentMatchDto.isTeamMatch;
    tourneyMatch.type = tournamentMatchDto.type;
    tourneyMatch.enableSignups = tournamentMatchDto.enableSignups;
    tourneyMatch.participants = tournamentMatchDto.participants;
    tourneyMatch.conditionals = tournamentMatchDto.conditionals;
    tourneyMatch.referees = tournamentMatchDto.referees as TournamentStaffMember[];
    tourneyMatch.streamers = tournamentMatchDto.streamers as TournamentStaffMember[];
    tourneyMatch.commentators = tournamentMatchDto.commentators as TournamentStaffMember[];
    tourneyMatch.matchIds = tournamentMatchDto.matchIds;
    tourneyMatch.vodLinks = tournamentMatchDto.vodLinks;
    tourneyMatch.matchProgression = tournamentMatchDto.matchProgression;

    await tourneyMatch.save();
    return tourneyMatch;
  }

  async removeTournamentMatch(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail();
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail();

    tourneyRound.matches = [...tourneyRound.matches.filter((match: HydratedDocument<TournamentMatch>) => !match._id.equals(matchId))];
    await tourneyRound.save();
  }

  async matchRegister(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId, caller: AppUser, teamId?: Types.ObjectId): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
        .populate("rounds").populate({ path: "teams", populate: "players" }).populate("players");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("matches");
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail();

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${matchId}`);
    if (match === undefined) throw new MatchNotFoundError();
    
    if (!tourneyMatch.enableSignups) throw new MatchSignupsNotEnabledError();

    // Assert that the match time hasn't passed yet
    if (Date.now() > new Date(match.time).getTime()) throw new MatchSignupLateError();
    
    // Assert that the match is not at max capacity yet
    if (tourneyMatch.type === "versus" && tourneyMatch.participants.length >= 2) throw new MatchSignupFullError();
    else if (tourneyMatch.type === "lobby" && tourneyMatch.participants.length >= tourneyMatch.maxLobbyParticipants) throw new MatchSignupFullError();

    if (tourneyMatch.isTeamMatch) {
      const team = tourney.teams.find(t => (t as HydratedDocument<TournamentTeam>)._id.equals(teamId));
      if (!team) throw new TeamNotFoundError();
      if (team.players[0]?.playerId !== caller.osuId) throw new NotTeamCaptainError();
      // playerOrTeam is an ObjectId here
      if (tourneyMatch.participants.find((participant) => participant.playerOrTeam.toString() === teamId.toString())) {
        throw new AlreadySignedUpToMatchError();
      }
      tourneyMatch.participants.push({ playerOrTeam: teamId, score: 0 });
      await tourneyMatch.save();
    }
    else {
      const player =  tourney.players.find((player) => player.playerId === caller.osuId) as HydratedDocument<TournamentPlayer>;
      if (!player) throw new PlayerNotRegisteredError();
      // playerOrTeam is an ObjectId here
      if (tourneyMatch.participants.find((participant) => participant.playerOrTeam.toString() === player._id.toString())) {
        throw new AlreadySignedUpToMatchError();
      }
      tourneyMatch.participants.push({ playerOrTeam: player._id, score: 0 });
      await tourneyMatch.save();
    }

    // just to include it in the response (note, do NOT do this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
    if (tourneyMatch.isTeamMatch) {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }
    return tourneyMatch;
  }

  async matchUnregister(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId, caller: AppUser, teamId?: Types.ObjectId): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
        .populate("rounds").populate({ path: "teams", populate: "players" }).populate("players");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("matches");
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail();

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${matchId}`);
    if (match === undefined) throw new MatchNotFoundError();
    
    if (!tourneyMatch.enableSignups) throw new MatchSignupsNotEnabledError();

    // Assert that the match time hasn't passed yet
    if (Date.now() > new Date(match.time).getTime()) throw new MatchSignupLateError();

    if (tourneyMatch.isTeamMatch) {
      const team = tourney.teams.find(t => (t as HydratedDocument<TournamentTeam>)._id.equals(teamId));
      if (!team) throw new TeamNotFoundError();
      if (team.players[0]?.playerId !== caller.osuId) throw new NotTeamCaptainError();
      // playerOrTeam is an ObjectId here
      tourneyMatch.participants = tourneyMatch.participants.filter((participant) => participant.playerOrTeam.toString() !== teamId.toString());
      await tourneyMatch.save();
    }
    else {
      const player =  tourney.players.find((player) => player.playerId === caller.osuId) as HydratedDocument<TournamentPlayer>;
      if (!player) throw new PlayerNotRegisteredError();
      // playerOrTeam is an ObjectId here
      tourneyMatch.participants = tourneyMatch.participants.filter((participant) => participant.playerOrTeam.toString() !== player._id.toString());
      await tourneyMatch.save();
    }

    // just to include it in the response (note, do NOT do this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
    if (tourneyMatch.isTeamMatch) {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }
    return tourneyMatch;
  }

  async submitMatch(acronym: string, roundId: Types.ObjectId, submitMatchDto: SubmitMatchDto, caller: AppUser): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds").populate("teams").populate("players");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const round = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`);
    if (round === undefined) throw new TournamentRoundNotFoundError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("matches").populate({ path: "mappool", populate: { path: "slots" } });
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: submitMatchDto.id }).orFail().populate("referees").populate("streamers").populate("commentators");

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${submitMatchDto.id}`);
    if (match === undefined) throw new MatchNotFoundError();

    tourneyMatch.participants = [...tourneyMatch.participants];
    tourneyMatch.matchIds = submitMatchDto.matchIds;

    for (let dtoParticipant of submitMatchDto.participants) {
      // playerOrTeam shouuuld both be Object IDs here
      const matchParticipant = tourneyMatch.participants.find((participant) => participant.playerOrTeam.toString() === dtoParticipant.playerOrTeam.toString());
      if (!matchParticipant) continue;
      matchParticipant.score = dtoParticipant.score;
      matchParticipant.rolls = dtoParticipant.rolls;
      matchParticipant.picks = dtoParticipant.picks;
      matchParticipant.bans = dtoParticipant.bans;
      matchParticipant.turnOrder = dtoParticipant.turnOrder;
    }

    const participantMap = new Map<string, TournamentMatchParticipant>();
    for (let participant of tourneyMatch.participants) participantMap.set(participant.playerOrTeam.toString(), participant);
    const turnOrder: Types.ObjectId[] = submitMatchDto.participants.sort((a, b) => (a.turnOrder ?? Number.MAX_SAFE_INTEGER) - (b.turnOrder ?? Number.MAX_SAFE_INTEGER)).map(p => (p.playerOrTeam as Types.ObjectId));
    const matchEvents: TournamentMatchEvent[] = [];

    if (submitMatchDto.generateMatchProgression) {
      // rolls (just take the 1st value for now, maybe support multiple rolls later)
      for (let participant of participantMap.values()) {
        if (participant.rolls?.length > 0) {
          matchEvents.push({ action: "roll", playerOrTeam: participant.playerOrTeam, value: participant.rolls[0].toString() });
        }
      }

      // bans (assume reverse turn order, and also take just the 1st value for now)
      const reverseTurnOrder = [...turnOrder].reverse();
      for (let participantId of reverseTurnOrder) {
        const participant = participantMap.get(participantId.toString());
        if (participant && participant.bans?.length > 0) {
          matchEvents.push({ action: "ban", playerOrTeam: participant.playerOrTeam, value: participant.bans[0].toString() });
        }
      }
    }

    for (let matchId of submitMatchDto.matchIds) {
      const events = await this.processMatch(acronym, roundId, matchId, submitMatchDto.generateMatchProgression, turnOrder);
      matchEvents.push(...events);
    }

    // auto generate picks so referees don't have to input them
    if (submitMatchDto.generateMatchProgression) {
      for (let event of matchEvents) {
        if (event.action === "pick") {
          const participant = participantMap.get(event.playerOrTeam.toString());
          if (participant) {
            if (!participant.picks) participant.picks = [];
            participant.picks.push(event.value);
          }
        }
      }

      const matchWinners = submitMatchDto.participants.filter(p => p.score === Math.max(...submitMatchDto.participants.map(p => p.score)));
      if (matchWinners.length === 1) {
        matchEvents.push({ action: "win", playerOrTeam: matchWinners[0].playerOrTeam, value: "match" });
      }
      tourneyMatch.matchProgression = matchEvents;
    }

    // discord log
    if (tourney.discordSettings.serverId && tourney.discordSettings.logChannelId) {
      const title = "Match submitted";
      let description = `\`${caller.osuUsername}\` submitted results for match \`${tourneyMatch.id}\` in \`${tourneyRound.name}\`\n\n`;
      description += `**Participants:**\n`;
      for (let participant of tourneyMatch.participants) {
        if (tourneyMatch.isTeamMatch) {
          const team = tourney.teams.find(t => (t as HydratedDocument<TournamentTeam>)._id.toString() === participant.playerOrTeam.toString());
          description += `- \`${team?.name}\`: ${participant.score}\n`;
        } else {
          const player = tourney.players.find(p => (p as HydratedDocument<TournamentPlayer>)._id.toString() === participant.playerOrTeam.toString());
          description += `- \`${player?.username}\`: ${participant.score}\n`;
        }
      }
      description += `\n**Match IDs:** ${submitMatchDto.matchIds.join(", ")}`;
      try {
        await this.discordService.log(tourney.discordSettings.serverId, tourney.discordSettings.logChannelId, title, description);
      } catch (error) {
        console.log(error);
      }
    }

    // I hate mongoose
    tourneyMatch.markModified('participants');
    await tourneyMatch.save();

    // just to include it in the response (note, do NOT do this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
    if (tourneyMatch.isTeamMatch) {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }
    return tourneyMatch;
  }

  // fetches the scores from the match ID and stores them in the tourney round's scoresheet
  // todo: this function is pretty heavy, might want to optimize it at some point
  // returns list of pick/play events based on turn order (if enabled)
  async processMatch(acronym: string, roundId: Types.ObjectId, matchId: number, generateMatchProgression: boolean = false, turnOrder: Types.ObjectId[] = []): Promise<TournamentMatchEvent[]> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail()
                      .populate({ path: "players" }).populate({ path: "teams", populate: { path: "players" } });

    if ([TournamentProgress.PLANNING, TournamentProgress.CONCLUDED].includes(tourney.progress)) throw new ProgressLockedError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail()
                           .populate({ path: "mappool", populate: { path: "slots", populate: { path: "beatmap" } } })
                           .populate({ path: "scoresheet", populate: { path: "slotScoresheets", populate: [
                                      { path: "slot" },
                                      { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
                                      { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
                                    ] } })

    const tourneyPlayersById: Map<number, TournamentPlayer> = new Map();
    for (let player of tourney.players) {
      tourneyPlayersById.set(player.playerId, player);
    }
    const tourneyTeamsById: Map<string, TournamentTeam> = new Map();
    for (let team of tourney.teams) {
      tourneyTeamsById.set((team as HydratedDocument<TournamentTeam>)._id.toString(), team);
    }

    const playerToTeamMap: Map<number, HydratedDocument<TournamentTeam>[]> = new Map();
    for (let team of tourney.teams) {
      for (let player of team.players) {
        if (!playerToTeamMap.has(player.playerId)) playerToTeamMap.set(player.playerId, []);
        playerToTeamMap.get(player.playerId).push(team as HydratedDocument<TournamentTeam>);
      }
    }

    // set up beatmapIdToSlot
    // todo: figure out how to handle cases where there are multiple slots with the same beatmap id maybe?
    const beatmapIdToSlot = new Map<number, HydratedDocument<MappoolSlot>>();
    for (let slot of tourneyRound.mappool.slots) {
      beatmapIdToSlot.set(slot.beatmap.beatmapId, slot as HydratedDocument<MappoolSlot>);
    }

    // set up slotScoresheetsById
    const theScoresheet = tourneyRound.scoresheet as HydratedDocument<Scoresheet>;
    const slotScoresheetsById = new Map<string, HydratedDocument<MappoolSlotScoresheet>>();
    for (let slotScoresheet of theScoresheet.slotScoresheets) {
      slotScoresheetsById.set((slotScoresheet.slot as HydratedDocument<MappoolSlot>)._id.toString(), slotScoresheet as HydratedDocument<MappoolSlotScoresheet>);
    }

    // set up match progression
    const matchEvents: TournamentMatchEvent[] = [];
    const scoreline = new Map<string, number>(turnOrder.map(id => [id.toString(), 0]));
    let currentPickerIndex = 0;
    let currentPick = "";
    
    // loop through events
    let match = await this.osuApiService.getMatch(matchId);
    // osu api returns a maximum of 100 events, so we need to fetch more if necessary
    while (match.events.length > 0 && match.events[0].id !== match.firstEventId) {
      const match2 = await this.osuApiService.getMatch(matchId, match.events[0].id);
      match = { ...match, events: match2.events.concat(match.events) };
    }
    // const matchScores: Map<number, Partial<ScoreDto>[]> = new Map(); // beatmap id -> scores
    for (let event of match.events) {
      if (event.game === undefined) continue;
      const results = new Map<string, number>(turnOrder.map(id => [id.toString(), 0]));

      const eventTimestamp = event.game.endTime;
      const eventBeatmapId = event.game.beatmapId;
      const slot = beatmapIdToSlot.get(eventBeatmapId);
      if (slot === undefined) continue;

      // match progression - pick
      if (generateMatchProgression && currentPick !== slot.label) {
        matchEvents.push({ action: "pick", playerOrTeam: turnOrder[currentPickerIndex % turnOrder.length], value: slot.label });
        currentPickerIndex++;
        currentPick = slot.label;
      }

      const slotId = slot._id.toString();
      // create slotScoresheet if it doesn't exist
      if (!slotScoresheetsById.has(slotId)) {
        const newSlotScoresheet = new this.mappoolSlotScoresheetModel({slot});
        await newSlotScoresheet.save();
        slotScoresheetsById.set(slotId, newSlotScoresheet);
        theScoresheet.slotScoresheets = [...theScoresheet.slotScoresheets, newSlotScoresheet];
        await theScoresheet.save();
      }
      const slotScoresheet = slotScoresheetsById.get(slotId);

      // set up playerEntriesById and teamEntriesById
      const workingPlayerEntries = [...slotScoresheet.playerScores];
      const playerEntriesById = new Map<number, HydratedDocument<MappoolSlotScoresheetEntry>>();
      for (let slotScoresheetEntry of workingPlayerEntries) {
        // another instance of mongoose auto converting newly created documents into ObjectIds so I have to refetch the document
        let player = slotScoresheetEntry.player;
        if (!player.playerId) player = await this.tournamentPlayerModel.findById(player);
        playerEntriesById.set(player.playerId, slotScoresheetEntry as HydratedDocument<MappoolSlotScoresheetEntry>);
      }
      const workingTeamEntries = [...slotScoresheet.teamScores];
      const teamEntriesById = new Map<string, HydratedDocument<MappoolSlotScoresheetEntry>>();
      for (let slotScoresheetEntry of workingTeamEntries) {
        teamEntriesById.set((slotScoresheetEntry.team as HydratedDocument<TournamentTeam>)._id.toString(), slotScoresheetEntry as HydratedDocument<MappoolSlotScoresheetEntry>);
      }

      // keep track of team scores for this event
      const teamScores = new Map<string, Partial<ScoreDto>>();

      for (let score of event.game.scores) {
        let scoreDto: Partial<ScoreDto> = {
          beatmapId: event.game.beatmapId,
          playerId: score.userId,
          timestamp: score.endedAt,
          score: score.score,
          mods: score.mods,
          accuracy: score.accuracy,
          countPerfect: score.statistics.perfect ?? 0,
          countGreat: score.statistics.great ?? 0,
          countGood: score.statistics.good ?? 0,
          countOk: score.statistics.ok ?? 0,
          countMeh: score.statistics.meh ?? 0,
          countMiss: score.statistics.miss ?? 0,
          countLargeTickHit: score.statistics.largeTickHit ?? 0,
          countSmallTickHit: score.statistics.smallTickHit ?? 0,
          maxCombo: score.maxCombo,
          matchId,
        };

        const playerId = scoreDto.playerId;
        // skip unregistered players
        if (!tourneyPlayersById.has(playerId)) continue;
        // create a new entry for this player if it doesn't exist yet
        if (!playerEntriesById.has(playerId)) {
          const newEntry = new this.mappoolSlotScoresheetEntryModel({ player: tourneyPlayersById.get(playerId), scores: [] });
          await newEntry.save();
          workingPlayerEntries.push(newEntry);
          playerEntriesById.set(playerId, newEntry);
        }
        const playerEntry = playerEntriesById.get(playerId);

        // insert the player score if it's not already there
        const existingPlayerScores = [...playerEntry.scores];
        let thePlayerScore: HydratedDocument<Score>|undefined = undefined;
        for (let existingScore of existingPlayerScores) {
          // weird issue where mongoose auto converts newly created documents into ObjectIds so I have to refetch the full documents
          if (isValidObjectId(existingScore) && !(existingScore instanceof Document)) {
            //console.log("fetching a score document");
            existingScore = await this.scoreModel.findById(existingScore);
          }
          if (existingScore.timestamp.getTime() === scoreDto.timestamp.getTime()) {
            thePlayerScore = existingScore as HydratedDocument<Score>;
            break;
          }
        }
        if (thePlayerScore === undefined) {
          const createdScore = new this.scoreModel(scoreDto);
          await createdScore.save();
          existingPlayerScores.push(createdScore);
          playerEntry.scores = existingPlayerScores;
          await playerEntry.save();
          thePlayerScore = createdScore;
        }

        // match progression - add player's score to the result
        if (generateMatchProgression) {
          const playerDoc = tourneyPlayersById.get(playerId) as HydratedDocument<TournamentPlayer>;
          if (results.has(playerDoc._id.toString())) results.set(playerDoc._id.toString(), scoreDto.score);
        }

        // add this score to the player's team(s)
        const playerTeams = playerToTeamMap.get(playerId);
        for (let playerTeam of playerTeams || []) {
          const teamId = playerTeam._id.toString();
          /*
          if (!teamEntriesById.has(teamId)) {
            const newEntry = new this.mappoolSlotScoresheetEntryModel({ team: playerTeam, scores: [] });
            await newEntry.save();
            workingTeamEntries.push(newEntry);
            teamEntriesById.set(teamId, newEntry);
          }
          */
          if (!teamScores.has(teamId)) {
            const teamScoreDto: Partial<ScoreDto> = {
              beatmapId: event.game.beatmapId,
              playerId: 0,
              timestamp: eventTimestamp,
              score: scoreDto.score,
              mods: [],
              accuracy: scoreDto.accuracy,
              countPerfect: scoreDto.countPerfect,
              countGreat: scoreDto.countGreat,
              countGood: scoreDto.countGood,
              countOk: scoreDto.countOk,
              countMeh: scoreDto.countMeh,
              countMiss: scoreDto.countMiss,
              countLargeTickHit: scoreDto.countLargeTickHit,
              countSmallTickHit: scoreDto.countSmallTickHit,
              maxCombo: scoreDto.maxCombo,
              matchId,
              //subscores: [thePlayerScore],
            };
            teamScores.set(teamId, teamScoreDto);
          } else {
            const existingTeamScoreDto: Partial<ScoreDto> = teamScores.get(teamId);
            const updatedTeamScoreDto: Partial<ScoreDto> = {
              ...existingTeamScoreDto,
              score: existingTeamScoreDto.score + scoreDto.score,
              mods: [],
              accuracy: existingTeamScoreDto.accuracy + scoreDto.accuracy,
              countPerfect: existingTeamScoreDto.countPerfect + scoreDto.countPerfect,
              countGreat: existingTeamScoreDto.countGreat + scoreDto.countGreat,
              countGood: existingTeamScoreDto.countGood + scoreDto.countGood,
              countOk: existingTeamScoreDto.countOk + scoreDto.countOk,
              countMeh: existingTeamScoreDto.countMeh + scoreDto.countMeh,
              countMiss: existingTeamScoreDto.countMiss + scoreDto.countMiss,
              countLargeTickHit: existingTeamScoreDto.countLargeTickHit + scoreDto.countLargeTickHit,
              countSmallTickHit: existingTeamScoreDto.countSmallTickHit + scoreDto.countSmallTickHit,
              maxCombo: Math.max(existingTeamScoreDto.maxCombo, scoreDto.maxCombo),
              matchId,
            };
            teamScores.set(teamId, updatedTeamScoreDto);
          }
        }

        /*
        if (!matchScores.has(event.game.beatmapId)) matchScores.set(event.game.beatmapId, []);
        matchScores.get(event.game.beatmapId).push({
          beatmapId: event.game.beatmapId,
          playerId: score.userId,
          timestamp: score.endedAt,
          score: score.score,
          mods: score.mods,
          accuracy: score.accuracy,
          countPerfect: score.statistics.perfect ?? 0,
          countGreat: score.statistics.great ?? 0,
          countGood: score.statistics.good ?? 0,
          countOk: score.statistics.ok ?? 0,
          countMeh: score.statistics.meh ?? 0,
          countMiss: score.statistics.miss ?? 0,
          countLargeTickHit: score.statistics.largeTickHit ?? 0,
          countSmallTickHit: score.statistics.smallTickHit ?? 0,
          maxCombo: score.maxCombo,
          matchId,
        });
        */
      }
      //console.log(teamScores);

      for (let teamId of teamScores.keys()) {
        const scoreDto = teamScores.get(teamId);
        // create a new entry for this team if it doesn't exist yet
        if (!teamEntriesById.has(teamId)) {
          const newEntry = new this.mappoolSlotScoresheetEntryModel({ team: tourneyTeamsById.get(teamId), scores: [] });
          await newEntry.save();
          workingTeamEntries.push(newEntry);
          teamEntriesById.set(teamId, newEntry);
        }
        const teamEntry = teamEntriesById.get(teamId);
        //console.log(teamEntry);

        // insert the team score if it's not already there
        const existingTeamScores = [...teamEntry.scores];
        let teamScoreExists: Score|undefined = undefined;
        for (let existingScore of existingTeamScores) {
          // weird issue where mongoose auto converts newly created documents into ObjectIds so I have to refetch the full documents
          if (isValidObjectId(existingScore) && !(existingScore instanceof Document)) {
            //console.log("fetching a score document");
            existingScore = await this.scoreModel.findById(existingScore);
          }
          if (existingScore.timestamp.getTime() === scoreDto.timestamp.getTime()) {
            teamScoreExists = existingScore;
            break;
          }
        }
        if (teamScoreExists === undefined) {
          const createdScore = new this.scoreModel(scoreDto);
          await createdScore.save();
          existingTeamScores.push(createdScore);
          teamEntry.scores = existingTeamScores;
          await teamEntry.save();
        }

        // match progression - add team's score to the result
        if (generateMatchProgression) {
          if (results.has(teamId)) results.set(teamId, scoreDto.score);
        }
      }

      // match progression - results/scoreline
      if (generateMatchProgression) {
        // yeah whatever man i can't be bothered
        matchEvents.push({ action: "play", value: slot.label, results: Array.from(results.entries()).map(([k, v]) => ({ playerOrTeam: k as any, score: v })) });
        const isTie = [...results.values()].every(score => score === results.values().next().value);
        if (!isTie) {
          const winnerId = [...results.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
          scoreline.set(winnerId, scoreline.get(winnerId) + 1);
          matchEvents.push({ action: "win", playerOrTeam: winnerId as any, value: slot.label, scoreline: Array.from(scoreline.entries()).map(([k, v]) => ({ playerOrTeam: k as any, score: v })) });
        } else {
          matchEvents.push({ action: "tie", value: slot.label, scoreline: Array.from(scoreline.entries()).map(([k, v]) => ({ playerOrTeam: k as any, score: v })) });
        }
      }

      slotScoresheet.playerScores = workingPlayerEntries;
      slotScoresheet.teamScores = workingTeamEntries;
      await slotScoresheet.save();
    }

    return matchEvents;

    // loop through mappool slots
    /*
    for (let slot of tourneyRound.mappool.slots) {
      // get the slotScoresheet for this slot (or create one if it doesn't exist yet)
      //console.log("AAAAAAAAAAAAAAAAAAAAAAAAAA");
      //console.log(slot.label);
      const hydratedMappoolSlot = slot as HydratedDocument<MappoolSlot>;
      const slotId = hydratedMappoolSlot._id.toString();
      // const mappoolSlotDocument = await this.mappoolSlotModel.findOne({ _id: slotId }).orFail().populate({ path: "playerScores.$*" });
      // if (!tourneyRound.scoresheet.playerScores.has(slotId)) {
      //   tourneyRound.scoresheet.playerScores.set(slotId, new Map<string, Score[]>());
      // }
      // would probably not handle cases with duplicate beatmap ids
      if (!slotScoresheetsById.has(slotId)) {
        const newSlotScoresheet = new this.mappoolSlotScoresheetModel({slot});
        await newSlotScoresheet.save();
        slotScoresheetsById.set(slotId, newSlotScoresheet);
        theScoresheet.slotScoresheets = [...theScoresheet.slotScoresheets, newSlotScoresheet];
        await theScoresheet.save();
      }
      const slotScoresheet = slotScoresheetsById.get(slotId);
      //console.log(slotScoresheet);

      // set up playerEntriesById
      const workingPlayerEntries = [...slotScoresheet.playerScores];
      const playerEntriesById = new Map<number, HydratedDocument<MappoolSlotScoresheetEntry>>();
      for (let slotScoresheetEntry of workingPlayerEntries) {
        playerEntriesById.set(slotScoresheetEntry.player.playerId, slotScoresheetEntry as HydratedDocument<MappoolSlotScoresheetEntry>);
      }

      // get the scores from the match for this slot (beatmap id) and loop through them
      const matchSlotScores = matchScores.get(hydratedMappoolSlot.beatmap.beatmapId) ?? [];
      for (let scoreDto of matchSlotScores) {
        const playerId = scoreDto.playerId;
        // skip unregistered players
        if (!tourneyPlayersById.has(playerId)) continue;
        // create new entry for this player if it doesn't exist yet
        if (!playerEntriesById.has(playerId)) {
          const newEntry = new this.mappoolSlotScoresheetEntryModel({ player: tourneyPlayersById.get(playerId), scores: [] });
          await newEntry.save();
          workingPlayerEntries.push(newEntry);
          playerEntriesById.set(playerId, newEntry);
        }

        // insert the score if it's not already there
        const entry = playerEntriesById.get(playerId);
        const existingScores = [...entry.scores];
        let scoreExists: Score|undefined = undefined;
        for (let existingScore of existingScores) {
          // weird issue where mongoose auto converts newly created documents into ObjectIds so I have to refetch the full documents
          if (isValidObjectId(existingScore) && !(existingScore instanceof Document)) {
            //console.log("fetching a score document");
            existingScore = await this.scoreModel.findById(existingScore);
          }
          if (existingScore.timestamp.getTime() === scoreDto.timestamp.getTime()) {
            scoreExists = existingScore;
            break;
          }
        }
        if (scoreExists === undefined) {
          const createdScore = new this.scoreModel(scoreDto);
          await createdScore.save();
          existingScores.push(createdScore);
          entry.scores = existingScores;
          await entry.save();
        }
      }
      slotScoresheet.playerScores = workingPlayerEntries;
      await slotScoresheet.save();
    }
    */
    // because mongoose doesn't know that it was modified even though it was auto converting my newly created documents ???
    // tourneyRound.markModified("scoresheet.playerScores");
    // I don't think I need this??
    //await tourneyRound.save();
  }

  async matchStaffRegister(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId, type: "referee"|"streamer"|"commentator", playerId: number): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffMembers");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("matches");
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail().populate("referees").populate("streamers").populate("commentators");

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${matchId}`);
    if (match === undefined) throw new MatchNotFoundError();

    // assuming this is guaranteed from the auth guard
    const staffMember = tourney.staffMembers.find((member: HydratedDocument<TournamentStaffMember>) => member.playerId === playerId);

    switch (type) {
      case "referee":
        if (tourneyMatch.referees.find((member) => member.playerId === playerId)) {
          throw new MatchStaffAlreadyRegisteredError();
        }
        tourneyMatch.referees.push(staffMember);
        break;
      case "streamer":
        if (tourneyMatch.streamers.find((member) => member.playerId === playerId)) {
          throw new MatchStaffAlreadyRegisteredError();
        }
        tourneyMatch.streamers.push(staffMember);
        break;
      case "commentator":
        if (tourneyMatch.commentators.find((member) => member.playerId === playerId)) {
          throw new MatchStaffAlreadyRegisteredError();
        }
        tourneyMatch.commentators.push(staffMember);
        break;
    }

    await tourneyMatch.save();

    // just to include it in the response (note, do NOT do this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
    if (tourneyMatch.isTeamMatch) {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }
    return tourneyMatch;
  }

  async matchStaffUnregister(acronym: string, roundId: Types.ObjectId, matchId: Types.ObjectId, type: "referee"|"streamer"|"commentator", playerId: number): Promise<TournamentMatch> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("staffMembers");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    const tourneyRound = await this.tournamentRoundModel.findOne({ _id: roundId }).orFail().populate("matches");
    const tourneyMatch = await this.tournamentMatchModel.findOne({ _id: matchId }).orFail().populate("referees").populate("streamers").populate("commentators");

    // Assert that the match is associated with the round
    const match = tourneyRound.matches.find((match: HydratedDocument<TournamentMatch>) => `${match._id}` === `${matchId}`);
    if (match === undefined) throw new MatchNotFoundError();

    // assuming this is guaranteed from the auth guard
    const staffMember = tourney.staffMembers.find((member: HydratedDocument<TournamentStaffMember>) => member.playerId === playerId);

    switch (type) {
      case "referee":
        tourneyMatch.referees = tourneyMatch.referees.filter((member) => member.playerId !== playerId);
        break;
      case "streamer":
        tourneyMatch.streamers = tourneyMatch.streamers.filter((member) => member.playerId !== playerId);
        break;
      case "commentator":
        tourneyMatch.commentators = tourneyMatch.commentators.filter((member) => member.playerId !== playerId);
        break;
    }

    await tourneyMatch.save();

    // just to include it in the response (note, do NOT do this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
    if (tourneyMatch.isTeamMatch) {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
    } else {
      await tourneyMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
    }
    return tourneyMatch;
  }

  async createScore(acronym: string, roundId: Types.ObjectId, slotScoresheetId: Types.ObjectId, playerOrTeamId: string, scoreDto: ScoreDto): Promise<Score> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds").populate("players").populate("teams");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const tourneyRound = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`) as HydratedDocument<TournamentRound>;
    if (tourneyRound === undefined) throw new TournamentRoundNotFoundError();

    await tourneyRound.populate(
      { path: "scoresheet", populate:
        { path: "slotScoresheets", populate: [
          { path: "slot", populate: { path: "beatmap" } },
          { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
          { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
    ]}});

    const theSlotScoresheet = tourneyRound.scoresheet.slotScoresheets.find((slotScoresheet) => `${(slotScoresheet as HydratedDocument<MappoolSlotScoresheet>)._id}` === `${slotScoresheetId}`) as HydratedDocument<MappoolSlotScoresheet>;
    if (!theSlotScoresheet) throw new MappoolSlotScoresheetNotFoundError();

    // Assert that the player or team is associated with the tourney
    const thePlayer = tourney.players.find((player: HydratedDocument<TournamentPlayer>) => player.playerId.toString() === `${playerOrTeamId}`) as HydratedDocument<TournamentPlayer>;
    const theTeam = tourney.teams.find((team: HydratedDocument<TournamentTeam>) => `${team._id}` === `${playerOrTeamId}`);
    if (thePlayer === undefined && theTeam === undefined) throw new PlayerOrTeamNotFoundError();

    const newScore = new this.scoreModel({
      ...scoreDto,
      playerId: thePlayer ? thePlayer.playerId : 0,
      beatmapId: theSlotScoresheet.slot.beatmap.beatmapId,
      isImported: false,
    });
    await newScore.save();

    // push the new score to the corresponding player/team entry (creating one if it doesn't exist already)
    if (thePlayer) {
      let playerEntry = theSlotScoresheet.playerScores.find((playerEntry) => playerEntry.player.playerId.toString() === playerOrTeamId) as HydratedDocument<MappoolSlotScoresheetEntry>;
      if (!playerEntry) {
        playerEntry = new this.mappoolSlotScoresheetEntryModel({ player: thePlayer, scores: [] });
        await playerEntry.save();
        theSlotScoresheet.playerScores.push(playerEntry);
        await theSlotScoresheet.save();
      }
      playerEntry.scores.push(newScore);
      await playerEntry.save();
      return newScore;
    } else {
      let teamEntry = theSlotScoresheet.teamScores.find((teamEntry) => `${(teamEntry.team as HydratedDocument<TournamentTeam>)._id}` === playerOrTeamId) as HydratedDocument<MappoolSlotScoresheetEntry>;
      if (!teamEntry) {
        teamEntry = new this.mappoolSlotScoresheetEntryModel({ team: theTeam, scores: [] });
        await teamEntry.save();
        theSlotScoresheet.teamScores.push(teamEntry);
        await theSlotScoresheet.save();
      }
      teamEntry.scores.push(newScore);
      await teamEntry.save();
      return newScore;
    }
  }

  async editScore(acronym: string, roundId: Types.ObjectId, slotScoresheetId: Types.ObjectId, scoreId: Types.ObjectId, editScoreDto: ScoreDto): Promise<Score> {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const tourneyRound = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`) as HydratedDocument<TournamentRound>;
    if (tourneyRound === undefined) throw new TournamentRoundNotFoundError();

    await tourneyRound.populate(
      { path: "scoresheet", populate:
        { path: "slotScoresheets", populate: [
          { path: "slot" },
          { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
          { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
    ]}});

    const theSlotScoresheet = tourneyRound.scoresheet.slotScoresheets.find((slotScoresheet) => `${(slotScoresheet as HydratedDocument<MappoolSlotScoresheet>)._id}` === `${slotScoresheetId}`);
    if (!theSlotScoresheet) throw new MappoolSlotScoresheetNotFoundError();

    let theScore: HydratedDocument<Score>|undefined;

    // find the score!
    for (let playerEntry of theSlotScoresheet.playerScores) {
      const theScore2 = playerEntry.scores.find((score) => `${(score as HydratedDocument<Score>)._id}` === `${scoreId}`);
      if (theScore2 !== undefined) {
        theScore = theScore2 as HydratedDocument<Score>;
        break;
      }
    }
    if (!theScore) {
      for (let teamEntry of theSlotScoresheet.teamScores) {
        const theScore2 = teamEntry.scores.find((score) => `${(score as HydratedDocument<Score>)._id}` === `${scoreId}`);
        if (theScore2 !== undefined) {
          theScore = theScore2 as HydratedDocument<Score>;
          break;
        }
      }
    }

    if (theScore === undefined) throw new ScoreNotFoundError();

    theScore.timestamp = editScoreDto.timestamp;
    theScore.score = editScoreDto.score || 0;
    theScore.mods = editScoreDto.mods as ScoreMod[];
    theScore.accuracy = editScoreDto.accuracy || 0;
    theScore.countPerfect = editScoreDto.countPerfect || 0;
    theScore.countGreat = editScoreDto.countGreat || 0;
    theScore.countGood = editScoreDto.countGood || 0;
    theScore.countOk = editScoreDto.countOk || 0;
    theScore.countMeh = editScoreDto.countMeh || 0;
    theScore.countMiss = editScoreDto.countMiss || 0;
    theScore.countLargeTickHit = editScoreDto.countLargeTickHit || 0;
    theScore.countSmallTickHit = editScoreDto.countSmallTickHit || 0;
    theScore.maxCombo = editScoreDto.maxCombo || 0;
    theScore.matchId = editScoreDto.matchId || 0;
    theScore.isImported = false;

    await theScore.save();
    return theScore;
  }

  async deleteScore(acronym: string, roundId: Types.ObjectId, slotScoresheetId: Types.ObjectId, scoreId: Types.ObjectId) {
    const tourney = await this.tournamentModel.findOne({ acronym: acronym.toLowerCase() }).orFail().populate("rounds");

    if (tourney.progress !== TournamentProgress.ONGOING) throw new ProgressLockedError();

    // Assert that the round is associated with the tourney
    const tourneyRound = tourney.rounds.find((round: HydratedDocument<TournamentRound>) => `${round._id}` === `${roundId}`) as HydratedDocument<TournamentRound>;
    if (tourneyRound === undefined) throw new TournamentRoundNotFoundError();

    await tourneyRound.populate(
      { path: "scoresheet", populate:
        { path: "slotScoresheets", populate: [
          { path: "slot" },
          { path: "playerScores", populate: [{ path: "player" }, { path: "scores" }] },
          { path: "teamScores", populate: [{ path: "team" }, { path: "scores" }] }
    ]}});

    const theSlotScoresheet = tourneyRound.scoresheet.slotScoresheets.find((slotScoresheet) => `${(slotScoresheet as HydratedDocument<MappoolSlotScoresheet>)._id}` === `${slotScoresheetId}`);
    if (!theSlotScoresheet) throw new MappoolSlotScoresheetNotFoundError();

    for (let playerEntry of theSlotScoresheet.playerScores) {
      const scoreIndex = playerEntry.scores.findIndex((score) => `${(score as HydratedDocument<Score>)._id}` === `${scoreId}`);
      if (scoreIndex !== -1) {
        playerEntry.scores.splice(scoreIndex, 1);
        await (playerEntry as HydratedDocument<MappoolSlotScoresheetEntry>).save();
        return;
      }
    }

    for (let teamEntry of theSlotScoresheet.teamScores) {
      const scoreIndex = teamEntry.scores.findIndex((score) => `${(score as HydratedDocument<Score>)._id}` === `${scoreId}`);
      if (scoreIndex !== -1) {
        teamEntry.scores.splice(scoreIndex, 1);
        await (teamEntry as HydratedDocument<MappoolSlotScoresheetEntry>).save();
        return;
      }
    }

    throw new ScoreNotFoundError();
  }
}