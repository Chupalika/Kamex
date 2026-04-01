import { HttpException, HttpStatus } from "@nestjs/common";

export class OsuApiError extends HttpException {
  constructor(message: string) {
    super(`Osu API returned an error: ${message}`, HttpStatus.BAD_GATEWAY);
  }
}

export class ChallongeApiError extends HttpException {
  constructor() {
    super("Challonge API returned an error.", HttpStatus.BAD_GATEWAY);
  }
}

export class ProgressChangeConflictError extends HttpException {
  constructor() {
    super("Progress can only be changed by itself and cannot have other settings be changed at the same time.", HttpStatus.BAD_REQUEST);
  }
}

export class ProgressChangeError extends HttpException {
  constructor() {
    super("Progress can only be advanced forward.", HttpStatus.BAD_REQUEST);
  }
}

export class ProgressLockedError extends HttpException {
  constructor() {
    super("Cannot edit this setting or data at the current tournament progress stage.", HttpStatus.BAD_REQUEST);
  }
}

export class SlotCategoryNotFoundError extends HttpException {
  constructor(acronym: string, categoryName: string) {
    super(`Slot category ${categoryName} not found in tournament ${acronym}.`, HttpStatus.BAD_REQUEST);
  }
}

/*
export class TourneyMismatchError extends HttpException {
  constructor() {
    super("The requested object ID(s) are not associated with this tournament.", HttpStatus.BAD_REQUEST);
  }
}
*/

export class RegistrationClosedError extends HttpException {
  constructor() {
    super("Registration is closed.", HttpStatus.BAD_REQUEST);
  }
}

export class UnregisterDisabledError extends HttpException {
  constructor() {
    super("Unregistration is disabled. Contact an admin.", HttpStatus.BAD_REQUEST);
  }
}

export class PlayerExistsError extends HttpException {
  constructor() {
    super("Player is already registered in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class PlayerNotRegisteredError extends HttpException {
  constructor() {
    super("Player is not registered in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class RankRequirementNotMetError extends HttpException {
  constructor() {
    super("Player is outside the required rank range.", HttpStatus.BAD_REQUEST);
  }
}

export class DiscordServerNotSetupError extends HttpException {
  constructor() {
    super("Discord enforcement was enabled but the server or bot was not set up properly. Contact staff.", HttpStatus.BAD_REQUEST);
  }
}

export class NotADiscordMemberError extends HttpException {
  constructor() {
    super("Player has not joined the required Discord server.", HttpStatus.BAD_REQUEST);
  }
}

export class TeamMissingPlayersError extends HttpException {
  constructor() {
    super("Teams should have at least one player!", HttpStatus.BAD_REQUEST);
  }
}

export class TeamCaptainError extends HttpException {
  constructor() {
    super("The team's captain needs to be one of its players.", HttpStatus.BAD_REQUEST);
  }
}

export class TeamCaptainExistsError extends HttpException {
  constructor() {
    super("The team's captain is already a captain of another team.", HttpStatus.BAD_REQUEST);
  }
}

export class NotTeamCaptainError extends HttpException {
  constructor() {
    super("Only the team captain can do this.", HttpStatus.BAD_REQUEST);
  }
}

export class TeamAlreadyAcceptedError extends HttpException {
  constructor() {
    super("Player is already confirmed for another team.", HttpStatus.BAD_REQUEST);
  }
}

export class PlayerNotFoundOnTeamError extends HttpException {
  constructor() {
    super("Player is not on this team.", HttpStatus.BAD_REQUEST);
  }
}

export class PlayerNotOnATeamError extends HttpException {
  constructor() {
    super("Player is not on any team.", HttpStatus.BAD_REQUEST);
  }
}

export class TeamExistsError extends HttpException {
  constructor() {
    super("Team with the same name is already registered in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class TeamNotFoundError extends HttpException {
  constructor() {
    super("Team not found in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class PlayerOrTeamNotFoundError extends HttpException {
  constructor() {
    super("Player or team ID not found in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class InvalidImageError extends HttpException {
  constructor() {
    super("Image must be jpg, png, or gif.", HttpStatus.BAD_REQUEST);
  }
}

export class StaffMemberNotFoundError extends HttpException {
  constructor() {
    super("Player is not registered as a staff member in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class StaffMemberExistsError extends HttpException {
  constructor() {
    super("Player is already registered as a staff member in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class StaffRoleNotFoundError extends HttpException {
  constructor() {
    super("Staff role not found.", HttpStatus.BAD_REQUEST);
  }
}

export class StaffRoleExistsError extends HttpException {
  constructor() {
    super("Role with this name already exists in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class TournamentRoundNotFoundError extends HttpException {
  constructor() {
    super("Tournament round not found in this tournament.", HttpStatus.BAD_REQUEST);
  }
}

export class MappoolSlotNotFoundError extends HttpException {
  constructor() {
    super("Slot not found in this mappool.", HttpStatus.BAD_REQUEST);
  }
}

export class MappoolSlotExistsError extends HttpException {
  constructor() {
    super("Slot with this label already exists in this mappool.", HttpStatus.BAD_REQUEST);
  }
}

export class LobbyExistsError extends HttpException {
  constructor() {
    super("Lobby with this id already exists in this round.", HttpStatus.BAD_REQUEST);
  }
}

export class MatchNotFoundError extends HttpException {
  constructor() {
    super("Match not found in this tournament round.", HttpStatus.BAD_REQUEST);
  }
}

export class MatchExistsError extends HttpException {
  constructor() {
    super("Match with this id already exists in this round.", HttpStatus.BAD_REQUEST);
  }
}

export class RefreshPlayersPartialFailure extends HttpException {
  constructor(usernames: string[]) {
    super(`Failed to refresh ${usernames.length} players: ${usernames}`, 207);
  }
}

export class DiscordUserAlreadyLinkedError extends HttpException {
  constructor(id) {
    super(`Discord user with ID ${id} is already linked to another app user.`, HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordServerAlreadyUsedError extends HttpException {
  constructor(id) {
    super(`Discord server with ID ${id} is already used by another tournament.`, HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordServerNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord server with ID ${id} not found.`, HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordChannelNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord channel with ID ${id} not found.`, HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordMemberNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord member with ID ${id} not found.`, HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordNotLinkedError extends HttpException {
  constructor() {
    super("This user does not have discord linked.", HttpStatus.BAD_GATEWAY);
  }
}

export class DiscordRoleNotFoundError extends HttpException {
  constructor(id?, name?) {
    let errorMessage; 
    if (id) errorMessage = `Discord role with ID ${id} not found.`;
    else if (name) errorMessage = `Discord role with name ${name} not found.`;
    else errorMessage = `Discord role not found.`;
    super(errorMessage, HttpStatus.BAD_GATEWAY);
  }
}

export class MatchStaffAlreadyRegisteredError extends HttpException {
  constructor() {
    super("You are already registered for this match!", HttpStatus.BAD_REQUEST);
  }
}

export class AlreadySignedUpToMatchError extends HttpException {
  constructor() {
    super("You are already signed up for this match!", HttpStatus.BAD_REQUEST);
  }
}

export class MatchSignupsNotEnabledError extends HttpException {
  constructor() {
    super("Signups aren't enabled for this match.", HttpStatus.BAD_REQUEST);
  }
}

export class MatchSignupLateError extends HttpException {
  constructor() {
    super("Match time has passed. Contact staff to register or unregister.", HttpStatus.BAD_REQUEST);
  }
}

export class MatchSignupFullError extends HttpException {
  constructor() {
    super("Match is at full capacity.", HttpStatus.BAD_REQUEST);
  }
}

export class MappoolSlotScoresheetNotFoundError extends HttpException {
  constructor() {
    super("Slot scoresheet not found.", HttpStatus.BAD_REQUEST);
  }
}

export class ScoreNotFoundError extends HttpException {
  constructor() {
    super("Score not found in this scoresheet.", HttpStatus.BAD_REQUEST);
  }
}