import { Request } from 'express';
import { Types } from 'mongoose';
import { AppUser } from 'src/schemas/app-user.schema';
import { TournamentPlayer } from 'src/schemas/tournament-player.schema';
import { TournamentTeam } from 'src/schemas/tournament-team.schema';

export interface RequestWithUser extends Request {
  user?: AppUser;
}

export type PlayerOrTeam = TournamentPlayer|TournamentTeam|Types.ObjectId;

export class Content {
  readonly key: string;
  readonly value: string;
}

export class SlotCategory {
  readonly name?: string;
  readonly color?: string;
  readonly iconLink?: string;
}

export class TournamentTheme {
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly fontName?: string;
}

export class ScoreMod {
  readonly acronym: string;
  readonly settings: ScoreModSetting[];
}

export class ScoreModSetting {
  readonly name: string;
  readonly value: boolean|number|string;
}

export class RegistrationSettings {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly minTeamSize: number;
  readonly maxTeamSize: number;
  readonly minRank: number;
  readonly maxRank: number;
  readonly enforceDiscord: boolean;
}

export class TournamentMatchParticipant {
  readonly playerOrTeam: PlayerOrTeam;
  score: number;
  rolls?: number[];
  picks?: string[];
  bans?: string[];
  turnOrder?: number;
}

export class TournamentMatchConditional {
  readonly matchId: string;
  readonly playerOrTeam: PlayerOrTeam;
  readonly win: boolean;
}

export class TournamentLink {
  readonly label: string;
  readonly link: string;
}

export class DiscordSettings {
  readonly serverId?: string;
  readonly logChannelId?: string;
  readonly playerRoleId?: string;
  readonly matchReminderChannelId?: string;
  readonly matchReminderMinutes?: number;
}

export class TournamentMatchEvent {
  readonly playerOrTeam?: PlayerOrTeam;
  readonly action: "roll"|"pick"|"ban"|"play"|"win"|"lose"|"tie"|string;
  readonly value: string;
  readonly results?: { playerOrTeam: PlayerOrTeam, score: number }[]; // scores from the game result, used for "play" events
  readonly scoreline?: { playerOrTeam: PlayerOrTeam, score: number }[]; // overall scoreline after the event, used for "win"/"lose" events
}