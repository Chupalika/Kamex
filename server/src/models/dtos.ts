import { GameMode, TournamentProgress } from './enums';
import { RegistrationSettings, TournamentMatchParticipant, SlotCategory, TournamentTheme, TournamentLink, DiscordSettings, TournamentMatchConditional, TournamentMatchEvent } from './models';

// Nested DTOs should not be edited. There should be separate methods for that.
// For example, to make changes to tournament.rounds, use createTournamentRound or editTournamentRound, not editTournament.
// Nested DTOs are also not expected to have their fields filled out (properly), other than _id. Use the _id to fetch the correct data.

export class AppUserDto {
  readonly _id: string;
  readonly osuId?: number;
  readonly osuUsername?: string;
  readonly osuCountryCode?: string;
  readonly osuAvatarUrl?: string;
  readonly discordId?: string;
  readonly discordUsername?: string;
  readonly timezone?: number;
  readonly loginTimestamp?: Date;
}

export class TournamentDto {
  readonly _id: string;
  readonly name?: string;
  readonly acronym?: string;
  readonly progress?: TournamentProgress;
  readonly gameMode?: GameMode;
  readonly enableTeams?: boolean;
  readonly ownerId?: number;
  readonly challongeId?: string;
  readonly challongeUrl?: string;
  readonly rounds?: TournamentRoundDto[];
  readonly registrationSettings?: RegistrationSettings;
  readonly discordSettings?: DiscordSettings;
  readonly bannerLink?: string;
  readonly theme?: TournamentTheme;
  readonly description?: string;
  readonly links?: TournamentLink[];
  readonly slotCategories?: SlotCategory[];
  readonly unlisted?: boolean;
}

export class TournamentRoundDto {
  readonly _id: string;
  readonly name?: string;
  readonly startDate?: Date;
  readonly mappool?: MappoolDto;
  readonly scoresheet?: ScoresheetDto;
  readonly matches?: TournamentMatchDto[];
  readonly mappoolWip?: boolean;
  readonly scoresheetWip?: boolean;
  readonly mappoolDownloadUrl?: string; // not part of the schema, used for convenience as part of round methods (since there is no need for dedicated mappool methods yet)
}

export class TournamentPlayerDto {
  readonly _id: string;
  readonly playerId?: number;
  readonly username?: string;
  readonly country?: string;
  readonly osuRank?: number;
  readonly osuPP?: number;
  readonly taikoRank?: number;
  readonly taikoPP?: number;
  readonly fruitsRank?: number;
  readonly fruitsPP?: number;
  readonly maniaRank?: number;
  readonly maniaPP?: number;
  readonly seed?: string;
  readonly appUser?: AppUserDto; // note: not stored as a reference in the db, should be manually populated using separate db call via playerId
}

export class TournamentTeamDto {
  readonly _id: string;
  readonly name?: string;
  readonly players?: TournamentPlayerDto[];
  readonly joinRequests?: TournamentPlayerDto[];
  readonly imageLink?: string;
  readonly seed?: string;
}

export class TournamentStaffMemberDto {
  readonly _id: string;
  readonly playerId?: number;
  readonly username?: string;
  readonly country?: string;
  readonly roles?: TournamentStaffRoleDto[];
  readonly appUser?: AppUserDto; // note: not stored as a reference in the db, should be manually populated using separate db call via playerId
}

export class TournamentStaffRoleDto {
  readonly _id: string;
  readonly name?: string;
  readonly permissions?: string[];
}

export class MappoolDto {
  readonly _id: string;
  readonly entries?: MappoolSlotDto[];
  readonly author?: AppUserDto;
  readonly tournamentRound?: TournamentRoundDto;
  readonly downloadUrl?: string;
}

export class MappoolSlotDto {
  readonly _id: string;
  readonly label?: string;
  readonly category?: string;
  readonly beatmap?: BeatmapDto;
  readonly requiredMods?: OsuModDto[];
  readonly validModCombinations?: OsuModDto[][];
  readonly gameMode?: GameMode;
  readonly adjustedStarRating?: number;
}

export class ScoresheetDto {
  readonly name?: string;
  readonly isPublic?: boolean;
  readonly ownerId?: number;
  readonly mappool?: MappoolDto;
  readonly slotScoresheets?: MappoolSlotScoresheetDto[];
}

export class MappoolSlotScoresheetDto {
  readonly slot?: MappoolSlotDto;
  readonly playerScores?: MappoolSlotScoresheetEntryDto[];
  readonly teamScores?: MappoolSlotScoresheetEntryDto[];
}

export class MappoolSlotScoresheetEntryDto {
  readonly player?: TournamentPlayerDto;
  readonly team?: TournamentTeamDto;
  readonly scores?: ScoreDto[];
}

export class BeatmapDto {
  readonly _id: string;
  readonly beatmapId?: number;
  readonly beatmapSetId?: number;
  readonly title?: string;
  readonly artist?: string;
  readonly difficultyName?: string;
  readonly mapper?: string;
  readonly mappers?: string[];
  readonly gameMode?: string;
  readonly starRating?: number;
  readonly length?: number;
  readonly bpm?: number;
  readonly od?: number;
  readonly localTimestamp?: Date;
}

export class TournamentMatchDto {
  readonly _id: string;
  readonly id?: string;
  readonly time?: Date;
  readonly isTeamMatch?: boolean;
  readonly type?: "versus"|"lobby";
  readonly enableSignups?: boolean;
  readonly participants?: TournamentMatchParticipant[];
  readonly conditionals?: TournamentMatchConditional[];
  readonly referees?: TournamentStaffMemberDto[];
  readonly streamers?: TournamentStaffMemberDto[];
  readonly commentators?: TournamentStaffMemberDto[];
  readonly matchIds?: number[];
  readonly vodLinks?: string[];
  readonly matchProgression?: TournamentMatchEvent[];
}

export class SubmitMatchDto {
  readonly id?: string;
  readonly participants?: TournamentMatchParticipant[];
  readonly matchIds?: number[];
  readonly generateMatchProgression?: boolean;
}

export class EditTeamNameDto {
  readonly name: string;
}

export class BatchAssignPlayerSeedsDto {
  readonly playerSeeds: { playerId: number; seed: string; }[];
}

export class BatchAssignTeamSeedsDto {
  readonly teamSeeds: { teamId: string; seed: string; }[];
}

export class MatchSignupDto {
  readonly teamId?: string;
}

/*
export class TournamentLobbyDto {
  readonly id?: string;
  readonly time?: Date;
  readonly players?: TournamentPlayerDto[];
  readonly teams?: TournamentTeamDto[];
  readonly matchIds?: number[];
}
*/

export class ScoreDto {
  readonly _id: string;
  readonly playerId?: number;
  readonly beatmapId?: number;
  readonly timestamp?: Date;
  readonly score?: number;
  readonly mods?: OsuModDto[];
  readonly accuracy?: number;
  readonly countPerfect?: number;
  readonly countGreat?: number;
  readonly countGood?: number;
  readonly countOk?: number;
  readonly countMeh?: number;
  readonly countMiss?: number;
  readonly countLargeTickHit?: number;
  readonly countSmallTickHit?: number;
  readonly maxCombo?: number;
  readonly matchId?: number;
  readonly isImported?: boolean;
  readonly subscores?: ScoreDto[];
}

export class OsuPlayerDto {
  readonly playerId?: number;
  readonly username?: string;
  readonly taikoRank?: number;
  readonly taikoPP?: number;
  readonly loginTimestamp?: Date;
}

export class OsuUserDto {
  readonly id?: number;
  readonly statistics?: OsuUserStatisticsDto;
  readonly username?: string;
  readonly country?: string;
}

export class OsuUserStatisticsDto {
  readonly pp?: number;
  readonly globalRank?: number;
}

export class OsuBeatmapDto {
  readonly accuracy?: number;
  readonly ar?: number;
  readonly beatmapset?: OsuBeatmapsetDto;
  readonly beatmapsetId?: number;
  readonly bpm?: number;
  readonly cs?: number;
  readonly difficultyRating?: number;
  readonly drain?: number;
  readonly hitLength?: number;
  readonly id?: number;
  readonly lastUpdated?: Date;
  readonly mode?: string;
  readonly totalLength?: number;
  readonly userId?: number;
  readonly version?: string;
  readonly owners?: OsuBeatmapOwnerDto[];
}

export class OsuBeatmapsetDto {
  readonly artist?: string;
  readonly creator?: string;
  readonly id?: number;
  readonly source?: string;
  readonly title?: string;
  readonly userId?: number;
}

export class OsuBeatmapDifficultyAttributesDto {
  readonly maxCombo?: number;
  readonly overallDifficulty?: number;
  readonly starRating?: number;
}

export class OsuBeatmapOwnerDto {
  readonly id?: number;
  readonly username?: string;
}

export class OsuMatchDto {
  readonly id?: number;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly firstEventId?: number;
  readonly lastEventId?: number;
  readonly name?: string;
  readonly events?: OsuMatchEventDto[];
}

export class OsuMatchEventDto {
  readonly id?: number;
  readonly timestamp?: Date;
  readonly userId?: number;
  readonly game?: OsuMatchEventGameDto;
}

export class OsuMatchEventGameDto {
  readonly beatmapId?: number;
  readonly id?: number;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly mode?: string;
  readonly mods?: string[];
  readonly scores?: OsuMatchEventGameScoreDto[];
}

export class OsuMatchEventGameScoreDto {
  readonly accuracy?: number;
  readonly endedAt?: Date;
  readonly maxCombo?: number;
  readonly mods?: OsuModDto[];
  readonly rank?: string;
  readonly score?: number;
  readonly statistics?: OsuMatchEventGameScoreStatisticsDto;
  readonly userId?: number;
}

export class OsuMatchEventGameScoreStatisticsDto {
  readonly perfect?: number;
  readonly great?: number;
  readonly good?: number;
  readonly ok?: number;
  readonly meh?: number;
  readonly miss?: number;
  readonly largeTickHit?: number;
  readonly smallTickHit?: number;
}

export class OsuModDto {
  readonly acronym?: string;
  readonly settings?: OsuModSettingDto[];
}

export class OsuModSettingDto {
  readonly name?: string;
  readonly value?: any;
}

export class ChallongeTournamentDto {
  readonly id?: string;
  readonly attributes?: ChallongeTournamentAttributesDto;
}

export class ChallongeTournamentAttributesDto {
  readonly tournamentType?: string;
  readonly url?: string;
  readonly name?: string;
  readonly description?: string;
}