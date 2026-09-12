import { HttpException, HttpStatus } from "@nestjs/common";

export class OsuApiError extends HttpException {
  constructor(message: string) {
    super(`Osu API returned an error: ${message}`, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class ChallongeApiError extends HttpException {
  constructor() {
    super("Challonge API returned an error.", HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class TournamentNotFound extends HttpException {
  constructor(acronym: string) {
    super(`Tournament ${acronym} not found.`, HttpStatus.NOT_FOUND);
  }
}

export class ProgressChangeConflictError extends HttpException {
  constructor() {
    super("Progress can only be changed by itself and cannot have other settings be changed at the same time.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ProgressChangeError extends HttpException {
  constructor() {
    super("Progress can only be advanced forward.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ProgressLockedError extends HttpException {
  constructor() {
    super("Cannot edit this setting or data at the current tournament progress stage.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class SlotCategoryNotFoundError extends HttpException {
  constructor(acronym: string, categoryName: string) {
    super(`Slot category ${categoryName} not found in tournament ${acronym}.`, HttpStatus.NOT_FOUND);
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
    super("Registration is closed.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class UnregisterDisabledError extends HttpException {
  constructor() {
    super("Unregistration is disabled. Contact an admin.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerExistsError extends HttpException {
  constructor() {
    super("Player is already registered in this tournament.", HttpStatus.CONFLICT);
  }
}

export class PlayerNotRegisteredError extends HttpException {
  constructor() {
    super("Player is not registered in this tournament.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class RankRequirementNotMetError extends HttpException {
  constructor() {
    super("Player is outside the required rank range.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class CountryRequirementNotMetError extends HttpException {
  constructor() {
    super("Player's country is not on the allowed list for this tournament.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordServerNotSetupError extends HttpException {
  constructor() {
    super("Discord enforcement was enabled but the server or bot was not set up properly. Contact staff.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NotADiscordMemberError extends HttpException {
  constructor() {
    super("Player has not joined the required Discord server.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class TeamMissingPlayersError extends HttpException {
  constructor() {
    super("Teams should have at least one player!", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class TeamCaptainError extends HttpException {
  constructor() {
    super("The team's captain needs to be one of its players.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class TeamCaptainExistsError extends HttpException {
  constructor() {
    super("The team's captain is already a captain of another team.", HttpStatus.CONFLICT);
  }
}

export class NotTeamCaptainError extends HttpException {
  constructor() {
    super("Only the team captain can do this.", HttpStatus.FORBIDDEN);
  }
}

export class TeamAlreadyAcceptedError extends HttpException {
  constructor() {
    super("Player is already confirmed for another team.", HttpStatus.CONFLICT);
  }
}

export class TeamEditsDisabledError extends HttpException {
  constructor() {
    super("Team edits are currently disabled.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerNotFoundOnTeamError extends HttpException {
  constructor() {
    super("Player is not on this team.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerAlreadyOnATeamError extends HttpException {
  constructor() {
    super("Player is already on a team.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerJoinRequestPendingError extends HttpException {
  constructor() {
    super("Player already has a pending request to join a team.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerJoinRequestNotFoundError extends HttpException {
  constructor() {
    super("Player does not have a pending join request for this team.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PlayerNotOnATeamError extends HttpException {
  constructor() {
    super("Player is not on any team.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class TeamExistsError extends HttpException {
  constructor() {
    super("Team with the same name is already registered in this tournament.", HttpStatus.CONFLICT);
  }
}

export class TeamNotFoundError extends HttpException {
  constructor() {
    super("Team not found in this tournament.", HttpStatus.NOT_FOUND);
  }
}

export class PlayerOrTeamNotFoundError extends HttpException {
  constructor() {
    super("Player or team ID not found in this tournament.", HttpStatus.NOT_FOUND);
  }
}

export class TeamAtMaximumCapacityError extends HttpException {
  constructor() {
    super("This team is at maximum capacity.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class InvalidImageError extends HttpException {
  constructor() {
    super("Image must be jpg, png, or gif.", HttpStatus.BAD_REQUEST);
  }
}

export class StaffMemberNotFoundError extends HttpException {
  constructor() {
    super("Player is not registered as a staff member in this tournament.", HttpStatus.NOT_FOUND);
  }
}

export class StaffMemberExistsError extends HttpException {
  constructor() {
    super("Player is already registered as a staff member in this tournament.", HttpStatus.CONFLICT);
  }
}

export class StaffRoleNotFoundError extends HttpException {
  constructor() {
    super("Staff role not found.", HttpStatus.NOT_FOUND);
  }
}

export class StaffRoleExistsError extends HttpException {
  constructor() {
    super("Role with this name already exists in this tournament.", HttpStatus.CONFLICT);
  }
}

export class TournamentRoundNotFoundError extends HttpException {
  constructor() {
    super("Tournament round not found in this tournament.", HttpStatus.NOT_FOUND);
  }
}

export class MappoolNotEmptyError extends HttpException {
  constructor() {
    super("Mappool must currently be empty in order to use this feature.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MappoolEmptyError extends HttpException {
  constructor() {
    super("Mappool is empty.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MappoolSlotNotFoundError extends HttpException {
  constructor() {
    super("Slot not found in this mappool.", HttpStatus.NOT_FOUND);
  }
}

export class MappoolSlotExistsError extends HttpException {
  constructor() {
    super("Slot with this label already exists in this mappool.", HttpStatus.CONFLICT);
  }
}

export class LobbyExistsError extends HttpException {
  constructor() {
    super("Lobby with this id already exists in this round.", HttpStatus.CONFLICT);
  }
}

export class MatchNotFoundError extends HttpException {
  constructor() {
    super("Match not found in this tournament round.", HttpStatus.NOT_FOUND);
  }
}

export class MatchExistsError extends HttpException {
  constructor() {
    super("Match with this id already exists in this round.", HttpStatus.CONFLICT);
  }
}

export class RefreshPlayersPartialFailure extends HttpException {
  constructor(usernames: string[]) {
    super(`Failed to refresh ${usernames.length} players: ${usernames}`, 207);
  }
}

export class DiscordUserAlreadyLinkedError extends HttpException {
  constructor(id) {
    super(`Discord user with ID ${id} is already linked to another app user.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordServerAlreadyUsedError extends HttpException {
  constructor(id) {
    super(`Discord server with ID ${id} is already used by another tournament.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordServerNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord server with ID ${id} not found.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordChannelNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord channel with ID ${id} not found.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordMemberNotFoundError extends HttpException {
  constructor(id) {
    super(`Discord member with ID ${id} not found.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordNotLinkedError extends HttpException {
  constructor() {
    super("This user does not have discord linked.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DiscordRoleNotFoundError extends HttpException {
  constructor(id?, name?) {
    let errorMessage; 
    if (id) errorMessage = `Discord role with ID ${id} not found.`;
    else if (name) errorMessage = `Discord role with name ${name} not found.`;
    else errorMessage = `Discord role not found.`;
    super(errorMessage, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MatchStaffAlreadyRegisteredError extends HttpException {
  constructor() {
    super("You are already registered for this match!", HttpStatus.CONFLICT);
  }
}

export class AlreadySignedUpToMatchError extends HttpException {
  constructor() {
    super("You are already signed up for this match!", HttpStatus.CONFLICT);
  }
}

export class MatchParticipantSignupsNotEnabledError extends HttpException {
  constructor() {
    super("Participant signups aren't enabled for this match.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MatchStaffSignupsNotEnabledError extends HttpException {
  constructor() {
    super("Staff signups aren't enabled for this match.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MatchSignupLateError extends HttpException {
  constructor() {
    super("Match time has passed. Contact staff to register or unregister.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MatchSignupFullError extends HttpException {
  constructor() {
    super("Match is at full capacity.", HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MappoolSlotScoresheetNotFoundError extends HttpException {
  constructor() {
    super("Slot scoresheet not found.", HttpStatus.NOT_FOUND);
  }
}

export class ScoreNotFoundError extends HttpException {
  constructor() {
    super("Score not found in this scoresheet.", HttpStatus.NOT_FOUND);
  }
}

export class TeamNameLengthError extends HttpException {
  constructor(max: number) {
    super(`Team name must be between 1 and ${max} characters.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumSlotCategoriesError extends HttpException {
  constructor(max: number) {
    super(`Number of slot categories cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumPodiumParticipantsError extends HttpException {
  constructor(max: number) {
    super(`Number of podium participants cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumPlayersError extends HttpException {
  constructor(max: number) {
    super(`Number of players cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumTeamsError extends HttpException {
  constructor(max: number) {
    super(`Number of teams cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumStaffMembersError extends HttpException {
  constructor(max: number) {
    super(`Number of staff members cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumStaffRolesError extends HttpException {
  constructor(max: number) {
    super(`Number of staff roles cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumRoundsError extends HttpException {
  constructor(max: number) {
    super(`Number of rounds cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumMappoolSlotsError extends HttpException {
  constructor(max: number) {
    super(`Number of mappool slots cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class NumRoundMatchesError extends HttpException {
  constructor(max: number) {
    super(`Number of matches in a round cannot exceed ${max}.`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}