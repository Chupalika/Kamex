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