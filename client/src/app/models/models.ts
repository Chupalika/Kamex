export enum GameMode {
  OSU = "osu",
  TAIKO = "taiko",
  FRUITS = "fruits",
  MANIA = "mania",
  ALL = "all",
}

export enum TournamentProgress {
  PLANNING = "planning",
  REGISTRATION = "registration",
  ONGOING = "ongoing",
  CONCLUDED = "concluded",
}

export interface Page {
  name: string;
  contents: { key: string, value: string }[];
}

export interface AppUser {
  osuId: number;
  osuUsername: string;
  osuCountryCode: string;
  osuAvatarUrl: string;
  discordId: number;
  discordUsername: string;
  timezone: number;
  loginTimestamp: Date;
}

export interface Mappool {
  _id: string;
  slots: MappoolSlot[];
  authorId?: number;
  tournamentRound?: TournamentRound;
  downloadUrl?: string;
}

export interface MappoolSlot {
  _id: string;
  label: string;
  category: string;
  beatmap: Beatmap;
  requiredMods: ScoreMod[];
  validModCombinations: ScoreMod[][];
  gameMode?: GameMode;
  adjustedStarRating?: number;
}

export interface Beatmap {
  _id: string;
  beatmapId: number;
  beatmapSetId: number;
  title: string;
  artist: string;
  difficultyName: string;
  mapper: string;
  gameMode: GameMode;
  starRating: number;
  length: number;
  bpm: number;
  cs: number;
  hp: number;
  od: number;
  ar: number;
  localTimestamp: Date;
}

export interface Scoresheet {
  _id: string;
  name?: string;
  isPublic: boolean;
  ownerId: number;
  admins: number[];
  mappool: Mappool;
  slotScoresheets: MappoolSlotScoresheet[];
}

export interface MappoolSlotScoresheet {
  _id: string;
  slot: MappoolSlot;
  playerScores: MappoolSlotScoresheetEntry[];
  teamScores: MappoolSlotScoresheetEntry[];
}

export interface MappoolSlotScoresheetEntry {
  player?: TournamentPlayer;
  team?: TournamentTeam;
  scores: Score[];
}

export interface Tournament {
  _id: string;
  name: string;
  acronym: string;
  unlisted: boolean;
  progress: TournamentProgress;
  gameMode: GameMode;
  bannerLink: string;
  description: string;
  links: TournamentLink[];
  enableTeams: boolean;
  allowTeamEdits: boolean;
  ownerId: number;
  rounds: TournamentRound[];
  players: TournamentPlayer[];
  teams: TournamentTeam[];
  staffMembers: TournamentStaffMember[];
  staffRoles: TournamentStaffRole[];
  registrationSettings: RegistrationSettings;
  discordSettings: DiscordSettings;
  theme: TournamentTheme;
  slotCategories: TournamentSlotCategory[];
}

export interface RegistrationSettings {
  startDate: Date;
  endDate: Date;
  minTeamSize: number;
  maxTeamSize: number;
  minRank: number;
  maxRank: number;
  enforceDiscord: boolean;
}

export interface DiscordSettings {
  serverId?: string;
  logChannelId?: string;
  playerRoleId?: string;
  matchReminderChannelId?: string;
  matchReminderMinutes?: number;
}

export interface TournamentPlayer {
  _id: string;
  playerId: number;
  username: string;
  country: string;
  osuRank: number;
  osuPP: number;
  taikoRank: number;
  taikoPP: number;
  fruitsRank: number;
  fruitsPP: number;
  maniaRank: number;
  maniaPP: number;
  seed?: string;
  appUser?: AppUser;
}

export interface TournamentTeam {
  _id: string;
  name: string;
  players: TournamentPlayer[];
  joinRequests: TournamentPlayer[];
  imageLink?: string;
  seed?: string;
}

export interface TournamentStaffMember {
  _id: string;
  playerId: number;
  username: string;
  country: string;
  roles: TournamentStaffRole[];
  appUser?: AppUser;
}

export interface TournamentStaffRole {
  _id: string;
  name: string;
  permissions: string[];
}

export enum TournamentStaffPermission {
  EDIT_TOURNAMENT_SETTINGS = "edit_tournament_settings",
  REGISTER = "register",
  MANAGE_PLAYERS = "manage_players",
  MANAGE_TEAMS = "manage_teams",
  MANAGE_STAFF_MEMBERS = "manage_staff_members",
  MANAGE_STAFF_ROLES = "manage_staff_roles",
  MANAGE_ROUNDS = "manage_rounds",
  MANAGE_SLOTS = "manage_slots",
  MANAGE_MATCHES = "manage_matches",
  SUBMIT_MATCHES = "submit_matches",
  VIEW_WIP_MAPPOOLS = "view_wip_mappools",
  VIEW_WIP_SCORESHEETS = "view_wip_scoresheets",
  REGISTER_REFEREE = "register_referee",
  REGISTER_STREAMER = "register_streamer",
  REGISTER_COMMENTATOR = "register_commentator",
  MANAGE_STATS = "manage_stats",
}

export interface TournamentRound {
  _id: string;
  name: string;
  startDate: Date;
  mappool: Mappool;
  scoresheet: Scoresheet;
  matches: TournamentMatch[];
  mappoolWip: boolean;
  scoresheetWip: boolean;
}

export interface TournamentTheme {
  primaryColor: string;
  accentColor: string;
  fontName?: string;
}

export interface TournamentSlotCategory {
  name: string;
  color?: string;
  iconLink?: string;
}

export interface TournamentLink {
  label: string;
  link: string;
}

export interface Score {
  _id: string;
  playerId: number;
  beatmapId: number;
  timestamp: Date;
  score: number;
  mods: ScoreMod[];
  accuracy: number;
  countGreat: number;
  countOk: number;
  countMeh: number;
  countMiss: number;
  maxCombo: number;
  matchId?: number;
  isImported: boolean;
}

export interface ScoreMod {
  readonly acronym: string;
  readonly settings?: ScoreModSetting[];
}

export interface ScoreModSetting {
  readonly name: string;
  readonly value: boolean|number|string;
}

export interface TournamentTeamScoreWithRank extends Score {
  teamId: string;
  rank: number;
  zscore: number;
}

export interface TournamentScoreWithRank extends Score {
  rank: number;
  zscore: number;
  playerName?: string;
  teamName?: string;
}

export interface MappoolSlotWithRanking extends MappoolSlot {
  playerRanking: TournamentScoreWithRank[]; // should be ordered
  teamRanking: TournamentTeamScoreWithRank[]; // should be ordered
}

export interface TournamentStatsPlayers {
  overallRanking: TournamentRoundPlayerOverallStats[]; // should be ordered
  slotRanking: Map<string, MappoolSlotWithRanking>; // slot label -> slot with rankings
  scoresByPlayer: Map<number, Map<string, TournamentScoreWithRank>>; // playerId -> slot label -> score
}

export interface TournamentStatsTeams {
  overallRanking: TournamentRoundTeamOverallStats[]; // should be ordered
  slotRanking: Map<string, MappoolSlotWithRanking>; // slot label -> slot with rankings
  scoresByTeam: Map<string, Map<string, TournamentTeamScoreWithRank>>; // teamId -> slot label -> score
}

export interface TournamentRoundPlayerOverallStats {
  playerId: number;
  rank: number;
  rankSum: number;
  scoreSum: number;
  numMaps: number;
  zscoreSum: number;
}

export interface TournamentRoundTeamOverallStats {
  teamId: string;
  rank: number;
  rankSum: number;
  scoreSum: number;
  numMaps: number;
  zscoreSum: number;
}

/*
export interface TournamentLobby {
  _id: string;
  id: string;
  time: Date;
  players: TournamentPlayer[];
  teams: TournamentTeam[];
  matchIds: number[];
}
*/

export interface TournamentMatch {
  _id: string;
  id: string;
  time: Date;
  isTeamMatch: boolean;
  type: "versus" | "lobby";
  enableSignups: boolean;
  maxLobbyParticipants: number;
  participants: TournamentMatchParticipant[];
  conditionals: TournamentMatchConditional[];
  referees: TournamentStaffMember[];
  streamers: TournamentStaffMember[];
  commentators: TournamentStaffMember[];
  matchIds: number[];
  vodLinks: string[];
  matchProgression: TournamentMatchEvent[];
}

export interface TournamentMatchParticipant {
  playerOrTeam: TournamentPlayer|TournamentTeam;
  score: number;
  rolls?: number[];
  picks?: string[];
  bans?: string[];
  turnOrder?: number;
}

export interface TournamentMatchConditional {
  matchId: string;
  playerOrTeam: TournamentPlayer|TournamentTeam;
  win: boolean;
}

export interface SubmitMatchDto {
  readonly id: string;
  readonly participants: TournamentMatchParticipant[];
  readonly matchIds: number[];
}

export interface TournamentMatchEvent {
  readonly playerOrTeam?: string;
  readonly action: "roll"|"pick"|"ban"|"play"|"win"|"lose"|"tie"|string;
  readonly value: string;
  readonly results?: { playerOrTeam: string, score: number }[]; // scores from the game result, used for "play" events
  readonly scoreline?: { playerOrTeam: string, score: number }[]; // overall scoreline after the event, used for "win"/"lose" events
}

export interface BatchAssignPlayerSeedsDto {
  readonly playerSeeds: { playerId: number; seed: string; }[];
}

export interface BatchAssignTeamSeedsDto {
  readonly teamSeeds: { teamId: string; seed: string; }[];
}