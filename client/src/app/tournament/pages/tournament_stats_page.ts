import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, inject, Inject, NgModule, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';
import { Observable, of, throwError } from "rxjs";

import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentRoundNavBarModule } from '../components/tournament_round_nav_bar';
import { TournamentPlayerCard } from '../components/tournament_player_card';
import { TournamentTeamCard } from '../components/tournament_team_card';
import { TournamentSlotCard } from '../components/tournament_slot_card';
import { HovercardModule } from 'src/app/components/hovercard';
import { calculateStats, calculateTeamStats, getLatestRoundIndex, getSortedMappool, hasPermission } from '../utils';
import { AppUser, Mappool, MappoolSlot, Tournament, TournamentRound, TournamentStaffPermission, TournamentStatsPlayers, TournamentStatsTeams, TournamentScoreWithRank, TournamentRoundPlayerOverallStats, TournamentRoundTeamOverallStats, GameMode, Scoresheet, TournamentPlayer, TournamentTeam, Score, ScoreMod, MappoolSlotScoresheet, MappoolSlotScoresheetEntry, TournamentProgress } from 'src/app/models/models';
import { NavBarModule } from "../../nav_bar/nav_bar";
import { TournamentsService } from '../../services/tournaments.service';
import { AuthService } from 'src/app/services/auth.service';
import { ScoreDetailsModule } from 'src/app/components/score_details';

interface OverallPlayerStats extends TournamentRoundPlayerOverallStats {
  playerName: string;
}

interface OverallTeamStats extends TournamentRoundTeamOverallStats {
  teamName: string;
}

interface MappedScoresheet extends Omit<Scoresheet, "slotScoresheets"> {
  slotScoresheets: Map<string, MappedMappoolSlotScoresheet>;
}

interface MappedMappoolSlotScoresheet extends Omit<MappoolSlotScoresheet, "playerScores" | "teamScores"> {
  playerScores: Map<number, MappoolSlotScoresheetEntry>;
  teamScores: Map<string, MappoolSlotScoresheetEntry>;
}

type TableRow = OverallPlayerStats | OverallTeamStats;

const EMPTY_MAPPOOL: Mappool = { _id: "", slots: [] };
const EMPTY_SCORESHEET: Scoresheet = { _id: "", isPublic: false, ownerId: 0, admins: [], mappool: EMPTY_MAPPOOL, slotScoresheets: [] };

@Component({
  selector: 'tournament-stats-page',
  templateUrl: './tournament_stats_page.html',
  styleUrls: ['./tournament_stats_page.scss']
})
export class TournamentStatsPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  sortedTournamentRounds: TournamentRound[] = [];
  selectedTournamentRound?: TournamentRound;
  loadingTournament = true;
  loadingRound = false;
  loadingStats = false;
  selectedRoundIndex: number = 0;
  selectedRoundId: string = "";
  sortedSlots: MappoolSlot[] = [];
  selectedSlot?: MappoolSlot;
  selectedSlotIndex = -1;
  selectedSlotLabel = "";
  tournamentRounds: Map<string, TournamentRound> = new Map(); // keyed by _id
  playerStats?: TournamentStatsPlayers;
  teamStats?: TournamentStatsTeams;
  mappedScoresheet: MappedScoresheet = { ...EMPTY_SCORESHEET, slotScoresheets: new Map() };
  appUser?: AppUser;
  mobileMode = false;
  canEditStats = false;

  settingsForm: FormGroup;
  displayModeFormControl: FormControl;
  combinedViewFormControl: FormControl;
  detailedStatsFormControl: FormControl;
  sortMethodFormControl: FormControl;
  ignoreZeroFormControl: FormControl;
  playerOrTeamStatsFormControl: FormControl;

  slotColumnNames = ["rank", "playerName", "score"];
  slotColumnNamesCombined = ["score"];

  overallPlayerRanking: TableRow[] = [];
  overallTeamRanking: TableRow[] = [];
  slotPlayerRankingsSorted: Map<string, (TournamentScoreWithRank|undefined)[]> = new Map();
  slotTeamRankingsSorted: Map<string, (TournamentScoreWithRank|undefined)[]> = new Map();
  slotPlayerRankings: Map<string, (TournamentScoreWithRank|undefined)[]> = new Map();
  slotTeamRankings: Map<string, (TournamentScoreWithRank|undefined)[]> = new Map();

  alphaSortedPlayers: TournamentPlayer[] = [];
  alphaSortedTeams: TournamentTeam[] = [];
  playerIdToPlayer: Map<number, TournamentPlayer> = new Map();
  teamIdToTeam: Map<string, TournamentTeam> = new Map();
  alphaSortedSlotScoresForPlayers: Map<string, MappoolSlotScoresheetEntry[]> = new Map();
  alphaSortedSlotScoresForTeams: Map<string, MappoolSlotScoresheetEntry[]> = new Map();
  maxNumScoresByPlayer: Map<number, number> = new Map();
  maxNumScoresByTeam: Map<string, number> = new Map();
  TournamentPlayerCard = TournamentPlayerCard;
  TournamentTeamCard = TournamentTeamCard;
  TournamentSlotCard = TournamentSlotCard;

  readonly dialogService = inject(MatDialog);

  constructor(
      private tournamentsService: TournamentsService,
      private authService: AuthService,
      private route: ActivatedRoute,
      private snackBar: MatSnackBar,
      private breakpointObserver: BreakpointObserver,
      private titleService: Title) {
    this.displayModeFormControl = new FormControl("leaderboard");
    this.combinedViewFormControl = new FormControl(false);
    this.detailedStatsFormControl = new FormControl(false);
    this.sortMethodFormControl = new FormControl("ranksum");
    this.ignoreZeroFormControl = new FormControl(true);
    this.playerOrTeamStatsFormControl = new FormControl("player");
    this.settingsForm = new FormGroup({
      displayMode: this.displayModeFormControl,
      combinedView: this.combinedViewFormControl,
      detailedStats: this.detailedStatsFormControl,
      sortMethod: this.sortMethodFormControl,
      ignoreZero: this.ignoreZeroFormControl,
      playerOrTeamStats: this.playerOrTeamStatsFormControl,
    });
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.acronym = params.get("acronym") || "";
        return this.tournamentsService.getTournament(this.acronym);
      }),
      take(1),
      finalize(() => {this.loadingTournament = false;}),
    ).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(`${tournament.name} Stats`);

      this.alphaSortedPlayers = [...this.tournament!.players].sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
      this.alphaSortedTeams = [...this.tournament!.teams].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      this.tournament.players.forEach((player) => this.playerIdToPlayer.set(player.playerId, player));
      this.tournament.teams.forEach((team) => this.teamIdToTeam.set(team._id, team));
      this.sortedTournamentRounds = [...tournament.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
      const latestRoundIndex = getLatestRoundIndex(this.sortedTournamentRounds);
      this.switchSelectedRoundIndex(latestRoundIndex);
      this.refreshCanEditStats();
    });
    this.authService.appUser$.subscribe((user) => {
      this.appUser = user;
      this.refreshCanEditStats();
    });
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }
  
  get overallColumnNames() {
    const ans = ["rank", "playerName"];
    if (this.ignoreZeroFormControl.value) ans.push("numMaps");
    switch (this.sortMethodFormControl.value) {
      case "ranksum":
        ans.push("rankSum");
        break;
      case "zscore":
        ans.push("zscoreSum");
        break;
    }
    ans.push("scoreSum");
    return ans;
  }

  canViewHiddenMappool() {
    return hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.VIEW_WIP_MAPPOOLS);
  }

  canViewHiddenScoresheet() {
    return hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.VIEW_WIP_SCORESHEETS);
  }

  switchSelectedRoundIndex(index: number) {
    if (this.loadingRound) return;
    this.selectedRoundIndex = index;
    this.selectedRoundId = this.sortedTournamentRounds[index]?._id ?? "";
    if (this.selectedRoundId && !this.tournamentRounds.has(this.selectedRoundId)) {
      this.loadingRound = true;
      this.tournamentsService.getTournamentRound(this.tournament!.acronym, this.selectedRoundId).pipe(
        switchMap((tourneyRound) => {
          // fetch mappool if it's wip but user has permission to view wip pool
          let theMappool = tourneyRound.mappool;
          if (typeof theMappool === "string") {
            if (this.canViewHiddenMappool()) {
              return this.tournamentsService.getTournamentMappool(this.tournament!.acronym, theMappool).pipe(map((mappool) => ({ tourneyRound, mappool })));
            }
            else {
              tourneyRound.mappool = EMPTY_MAPPOOL;
              return of({ tourneyRound, mappool: null });
            }
          } else {
            return of({ tourneyRound, mappool: theMappool });
          }
        }),
        switchMap(({ tourneyRound, mappool }) => {
          // fetch scoresheet if it's wip but user has permission to view wip scoresheet
          let theScoresheet = tourneyRound.scoresheet;
          if (typeof theScoresheet === "string") {
            if (this.canViewHiddenScoresheet()) {
              return this.tournamentsService.getTournamentScoresheet(this.tournament!.acronym, theScoresheet).pipe(map((scoresheet) => ({ tourneyRound, mappool, scoresheet })));
            }
            else {
              tourneyRound.scoresheet = EMPTY_SCORESHEET;
              return of({ tourneyRound, mappool, scoresheet: null });
            }
          } else {
            return of({ tourneyRound, mappool, scoresheet: theScoresheet });
          }
        }),
        catchError((error) => {
          this.loadingRound = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })
      ).subscribe(({ tourneyRound, mappool, scoresheet }) => {
          if (mappool) tourneyRound.mappool = mappool;
          if (scoresheet) tourneyRound.scoresheet = scoresheet;
          this.tournamentRounds.set(this.selectedRoundId!, tourneyRound);
          this.selectedTournamentRound = tourneyRound;
          this.loadingRound = false;
          this.recalcStats();
          this.mapScoresheet();
        });
    } else if (this.selectedRoundId && this.tournamentRounds.has(this.selectedRoundId)) {
      this.selectedTournamentRound = this.tournamentRounds.get(this.selectedRoundId)!;
      this.recalcStats();
      this.mapScoresheet();
    }
  }

  recalcStats() {
    this.loadingStats = true;

    if (this.tournament?.enableTeams) {
      this.teamStats = calculateTeamStats(this.selectedTournamentRound!.mappool, this.selectedTournamentRound!.scoresheet, this.tournament!.teams, this.sortMethodFormControl.value, this.ignoreZeroFormControl.value);
      this.overallTeamRanking = this.teamStats.overallRanking.map((x) => {
        const team = this.tournament!.teams.find((y) => y._id === x.teamId);
        return {
          ...x,
          teamName: team?.name ?? "",
        };
      });
      this.slotTeamRankingsSorted.clear();
      this.slotTeamRankings.clear();
      for (let label of this.teamStats.slotRanking.keys()) {
        const slot = this.teamStats.slotRanking.get(label)!;
        const overallStatsColumn = this.teamStats.overallRanking;
        const rankingSorted = overallStatsColumn.map((overallStats) => slot.teamRanking.find((x) => x.teamId === overallStats.teamId));
        this.slotTeamRankingsSorted.set(label, rankingSorted);
        const ranking = slot.teamRanking.map((x) => {
          const team = this.tournament!.teams.find((y) => y._id === x.teamId);
          return {
            ...x,
            teamName: team?.name ?? "",
          };
        });
        this.slotTeamRankings.set(label, ranking);
      }
    }

    this.playerStats = calculateStats(this.selectedTournamentRound!.mappool, this.selectedTournamentRound!.scoresheet, this.tournament!.players, this.sortMethodFormControl.value, this.ignoreZeroFormControl.value);
    this.overallPlayerRanking = this.playerStats.overallRanking.map((x) => {
      const player = this.tournament!.players.find((y) => y.playerId === x.playerId);
      return {
        ...x,
        playerName: player?.username ?? "",
      };
    });
    this.slotPlayerRankingsSorted.clear();
    this.slotPlayerRankings.clear();
    for (let label of this.playerStats.slotRanking.keys()) {
      const slot = this.playerStats.slotRanking.get(label)!;
      const overallStatsColumn = this.playerStats.overallRanking;
      const rankingSorted = overallStatsColumn.map((overallStats) => slot.playerRanking.find((x) => x.playerId === overallStats.playerId));
      this.slotPlayerRankingsSorted.set(label, rankingSorted);
      const ranking = slot.playerRanking.map((x) => {
        const player = this.tournament!.players.find((y) => y.playerId === x.playerId);
        return {
          ...x,
          playerName: player?.username ?? "",
        };
      });
      this.slotPlayerRankings.set(label, ranking);
    }

    this.sortedSlots = getSortedMappool(this.tournament!, this.selectedTournamentRound!.mappool);
    // Auto switch to the slot with the same label as currently selected one if it exists
    const correspondingSlotIndex = this.sortedSlots.findIndex((slot) => slot.label === this.selectedSlotLabel);
    if (correspondingSlotIndex >= 0) this.switchSelectedSlotIndex(correspondingSlotIndex);
    else this.switchSelectedSlotIndex(this.selectedSlotIndex);

    this.loadingStats = false;
  }

  mapScoresheet() {
    this.mappedScoresheet = {
      ...this.selectedTournamentRound!.scoresheet,
      slotScoresheets: new Map(this.selectedTournamentRound!.scoresheet.slotScoresheets.map((slotScoresheet) => {
        const mappedSlotScoresheet: MappedMappoolSlotScoresheet = {
          ...slotScoresheet,
          playerScores: new Map(slotScoresheet.playerScores.map((entry) => [entry.player!.playerId, entry])),
          teamScores: new Map(slotScoresheet.teamScores.map((entry) => [entry.team!._id, entry])),
        };
        return [slotScoresheet.slot.label, mappedSlotScoresheet];
      })),
    };
    this.refreshMaps();
  }

  refreshMaps() {
    this.alphaSortedSlotScoresForPlayers = new Map();
    this.alphaSortedSlotScoresForTeams = new Map();
    this.maxNumScoresByPlayer = new Map();
    this.maxNumScoresByTeam = new Map();
    for (let [label, slotScoresheet] of this.mappedScoresheet.slotScoresheets.entries()) {
      this.alphaSortedSlotScoresForPlayers.set(label, this.getAlphaSortedSlotScoresForPlayers(label));
      this.alphaSortedSlotScoresForTeams.set(label, this.getAlphaSortedSlotScoresForTeams(label));
      for (let [playerId, entry] of slotScoresheet.playerScores.entries()) {
        const previousMax = this.maxNumScoresByPlayer.get(playerId) ?? 0;
        this.maxNumScoresByPlayer.set(playerId!, Math.max(entry.scores.length, previousMax));
      }
      for (let [teamId, entry] of slotScoresheet.teamScores.entries()) {
        const previousMax = this.maxNumScoresByTeam.get(teamId) ?? 0;
        this.maxNumScoresByTeam.set(teamId!, Math.max(entry.scores.length, previousMax));
      }
    }
  }

  getCellHeight(playerOrTeamId: number|string) {
    if (this.playerOrTeamStatsFormControl.value === 'player') {
      return Math.max(((this.maxNumScoresByPlayer.get(playerOrTeamId as number) ?? 0) + 1), 2) * 20;
    } else {
      return Math.max(((this.maxNumScoresByTeam.get(playerOrTeamId as string) ?? 0) + 1), 2) * 20;
    }
  }

  getAlphaSortedSlotScoresForPlayers(slotLabel: string): MappoolSlotScoresheetEntry[] {
    const slotScoresheet = this.mappedScoresheet.slotScoresheets.get(slotLabel);
    if (!slotScoresheet) return [];
    return this.alphaSortedPlayers.map((player) => slotScoresheet.playerScores.get(player.playerId) || { player, scores: [] });
  }

  getAlphaSortedSlotScoresForTeams(slotLabel: string): MappoolSlotScoresheetEntry[] {
    const slotScoresheet = this.mappedScoresheet.slotScoresheets.get(slotLabel);
    if (!slotScoresheet) return [];
    return this.alphaSortedTeams.map((team) => slotScoresheet.teamScores.get(team._id) || { team, scores: [] });
  }

  refreshCanEditStats() {
    if (this.tournament) this.canEditStats = !this.isTourneyConcluded && hasPermission(this.tournament, this.appUser?.osuId, TournamentStaffPermission.MANAGE_STATS);
  }

  switchSelectedSlotIndex(index: number) {
    this.selectedSlotIndex = index;
    this.selectedSlot = this.sortedSlots[index];
    this.selectedSlotLabel = this.selectedSlot?.label || "";
  }

  getRoundlabels() {
    const sortedRounds = [...this.tournament!.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
    return sortedRounds.map(round => round.name) ?? [];
  }

  getSlotLabels() {
    return this.sortedSlots.map((slot) => slot.label) || [];
  }

  getSlotColumnNames() {
    const ans = [];
    if (!this.combinedViewFormControl.value) ans.push(...["rank", "playerName"]);
    if (this.sortMethodFormControl.value === "zscore") ans.push("zscore");
    ans.push("score");
    if (this.detailedStatsFormControl.value) {
      switch (this.tournament!.gameMode) {
        case GameMode.OSU:
          ans.push("countOk", "countMeh", "countMiss");
          break;
        case GameMode.TAIKO:
          ans.push("countOk", "countMiss");
          break;
        case GameMode.FRUITS:
        case GameMode.MANIA:
        case GameMode.ALL:
          ans.push("accuracy");
          break;
      }
      if (this.playerOrTeamStatsFormControl.value === 'player') ans.push("mods");
    }
    return ans;
  }

  get gameMode() {
    return this.tournament!.gameMode;
  }

  getPlayer(id: number) {
    return this.playerIdToPlayer.get(id);
  }

  getTeam(id: string) {
    return this.teamIdToTeam.get(id);
  }

  getPlayerTeams(playerId: number) {
    return this.alphaSortedTeams.filter((team) => team.players.some(player => player.playerId === playerId));
  }

  formatScore(score: Score) {
    return score.score.toLocaleString();
  }

  getModsString(mods: ScoreMod[]): string {
    return mods.map((mod: ScoreMod) => mod.acronym).join("");
  }

  formatAvg(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
  }

  getCategory(slot: MappoolSlot) {
    return this.tournament?.slotCategories.find((category) => category.name === slot.category);
  }

  get canAssignSeeds() {
    //if (this.isTourneyConcluded) return false;
    if (this.playerOrTeamStatsFormControl.value === 'team') return hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.MANAGE_TEAMS);
    else return hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.MANAGE_PLAYERS);
  }

  assignSeeds() {
    const dialogRef = this.dialogService.open(AssignSeedsDialog, { data: { type: this.playerOrTeamStatsFormControl.value, method: "overall ranking" } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.playerOrTeamStatsFormControl.value === 'team') {
          const seedsToAssign = this.overallTeamRanking.map((row) => ({ teamId: (row as OverallTeamStats).teamId, seed: row.rank.toString() })).filter((entry) => entry.seed <= result);
          this.tournamentsService.batchAssignTeamSeeds(this.tournament!.acronym, { teamSeeds: seedsToAssign }).subscribe(() => {
            this.snackBar.open("Team seeds assigned.", "", { duration: 10000 });
          });
        } else {
          const seedsToAssign = this.overallPlayerRanking.map((row) => ({ playerId: (row as OverallPlayerStats).playerId, seed: row.rank.toString() })).filter((entry) => entry.seed <= result);
          this.tournamentsService.batchAssignPlayerSeeds(this.tournament!.acronym, { playerSeeds: seedsToAssign }).subscribe(() => {
            this.snackBar.open("Player seeds assigned.", "", { duration: 10000 });
          });
        }
      }
    });
  }

  openScoreDetails2(slot: MappoolSlot, score: any) {
    this.dialogService.open(ScoreDetailsDialog, { data: { slot, score, playerName: score.playerName ?? score.teamName, canEdit: false } });
  }

  openScoreDetails(slot: MappoolSlot, entry: MappoolSlotScoresheetEntry, score?: Score, isNew: boolean = false) {
    let playerName = "";
    let playerId = "";
    if (entry.player) {
      playerId = `${entry.player.playerId}`;
      playerName = this.getPlayer(entry.player.playerId)?.username ?? `{element.player.playerId}`;
    } else if (entry.team) {
      playerId = `${entry.team._id}`;
      playerName = this.getTeam(playerId)?.name ?? `{element.team._id}`;
    }
    if (!isNew && (!score || score.score === 0)) return;
    const slotScoresheet = this.mappedScoresheet.slotScoresheets.get(slot.label)!;
    const dialogRef = this.dialogService.open(ScoreDetailsDialog, { data: { slot, score, playerName, isNew, canEdit: this.canEditStats, acronym: this.acronym, roundId: this.selectedRoundId, slotScoresheetId: slotScoresheet._id, playerOrTeamId: playerId } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let theEntry: MappoolSlotScoresheetEntry;
        // create entry in mappedScoresheet if it doesn't exist already, otherwise new scores will not show up
        if (entry.player) {
          if (!slotScoresheet.playerScores.has(entry.player.playerId)) slotScoresheet.playerScores.set(entry.player.playerId, entry);
          theEntry = slotScoresheet.playerScores.get(entry.player.playerId)!;
        } else {
          if (!slotScoresheet.teamScores.has(entry.team!._id)) slotScoresheet.teamScores.set(entry.team!._id, entry);
          theEntry = slotScoresheet.teamScores.get(entry.team!._id)!;
        }

        const existingScoreIndex = theEntry.scores.findIndex((score) => score._id === result._id);
        if (existingScoreIndex >= 0) {
          if (result.delete) theEntry.scores.splice(existingScoreIndex, 1);
          else {
            theEntry.scores[existingScoreIndex] = result;
          }
        }
        else theEntry.scores.push(result);
        this.refreshMaps();
      }
    });
  }

  generateAndCopyBracketJson() {
    const gameMode = this.tournament!.gameMode;
    const ruleset = {
      ShortName: gameMode,
      OnlineID: Object.values(GameMode).indexOf(gameMode),
      Name: `osu!${gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}`
    };

    const isTeam = this.tournament!.enableTeams;
    const overallRanking = isTeam ? this.overallTeamRanking : this.overallPlayerRanking;

    // setup
    const scoresByCategory = new Map<string, Map<string, number>>(); // category -> team/player name -> score sum
    const mapsByCategory = new Map<string, string[]>(); // category -> map labels
    for (const slot of this.sortedSlots) {
      if (!scoresByCategory.has(slot.category)) scoresByCategory.set(slot.category, new Map<string, number>());
      const categoryScores = scoresByCategory.get(slot.category)!;

      const slotRankings = isTeam ? this.slotTeamRankings.get(slot.label)! : this.slotPlayerRankings.get(slot.label)!;
      for (let i = 0; i < slotRankings!.length; i++) {
        const scoreEntry = slotRankings[i]!;
        const teamName = isTeam ? scoreEntry.teamName! : scoreEntry.playerName!;
        const teamScore = scoreEntry.score;
        if (!categoryScores.has(teamName)) categoryScores.set(teamName, 0);
        categoryScores.set(teamName, categoryScores.get(teamName)! + teamScore);
      }

      if (!mapsByCategory.has(slot.category)) mapsByCategory.set(slot.category, []);
      mapsByCategory.get(slot.category)!.push(slot.label);
    }

    const categoryRankings: Map<string, { name: string, score: number }[]> = new Map();
    for (const [category, teamScores] of scoresByCategory.entries()) {
      const sorted = [...teamScores.entries()].sort((a, b) => b[1] - a[1]).map(([name, score]) => ({ name, score }));
      categoryRankings.set(category, sorted);
    }

    // build team seeding results
    const teams: any[] = [];
    for (let entry of overallRanking) {
      let players: { id: number }[] = [];
      let theTeam: TournamentTeam|undefined = undefined;
      let thePlayer: TournamentPlayer|undefined = undefined;
      if (isTeam) {
        theTeam = this.getTeam((entry as OverallTeamStats).teamId)!;
        players = theTeam.players.map((p) => ({ id: p.playerId }));
      } else {
        thePlayer = this.getPlayer((entry as OverallPlayerStats).playerId)!;
        players = [{ id: thePlayer.playerId }];
      }

      const name = isTeam ? theTeam!.name : thePlayer!.username;
      const acronym = name.substring(0, 3).toUpperCase();
      const flag = isTeam ? (theTeam!.players[0]?.country ?? acronym) : (thePlayer!.country ?? acronym);
      const rank = entry.rank;

      let seedingResults: any[] = [];
      for (let [category, entry2] of categoryRankings.entries()) {
        const categoryResults = new Map<string, any>();
        for (let i = 0; i < entry2.length; i++) {
          const item = entry2[i];
          if (item.name === name) {
            categoryResults.set("Mod", category);
            categoryResults.set("Seed", i + 1);
            categoryResults.set("Beatmaps", []);
            for (const mapLabel of mapsByCategory.get(category)!) {
              const slot = this.sortedSlots.find(s => s.label === mapLabel)!;
              const ranking = isTeam ? this.slotTeamRankings.get(slot.label)! : this.slotPlayerRankings.get(slot.label)!;
              const teamResult = ranking.find((r) => (isTeam ? r?.teamName === name : r?.playerName === name));
              const score = teamResult ? teamResult.score : 0;
              const seed = teamResult ? teamResult.rank : 0;
              categoryResults.get("Beatmaps").push({ ID: slot.beatmap.beatmapId, Score: score, Seed: seed });
            }
          }
        }
        if (categoryResults.size > 0) seedingResults.push(Object.fromEntries(categoryResults));
      }

      teams.push({ FullName: name, Acronym: acronym, FlagName: flag, Seed: rank, Players: players, SeedingResults: seedingResults});
    }

    const bracket = {
      Ruleset: ruleset,
      Teams: teams
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bracket, null, 2));
    this.snackBar.open("Bracket JSON copied to clipboard!", "", { duration: 5000 });
  }

  // ai generated because i'm lazy lol (with some edits and fixes)
  copytable() {
    // Determine if team stats or player stats is enabled
    const isTeam = this.playerOrTeamStatsFormControl.value === 'team';
    const combined = this.combinedViewFormControl.value;
    const detailed = this.detailedStatsFormControl.value;
    const ignoreZero = this.ignoreZeroFormControl.value;
    const sortMethod = this.sortMethodFormControl.value;
    let slots: MappoolSlot[] = [];
    if (combined) {
      slots = this.sortedSlots;
    } else {
      // Only include the selected slot
      if (this.selectedSlotIndex >= 0 && this.selectedSlotIndex < this.sortedSlots.length) {
        slots = [this.sortedSlots[this.selectedSlotIndex]];
      } else {
        slots = [];
      }
    }
    const gameMode = this.tournament!.gameMode;

    // Get overall columns and data
    const overallColumns = this.overallColumnNames;
    const overallRows = isTeam ? this.overallTeamRanking : this.overallPlayerRanking;

    // Prepare slot columns
    const slotColumnsPerSlot = slots.map(slot => {
      return this.getSlotColumnNames();
      /*
      const cols = [];
      if (!combined) cols.push("rank", isTeam ? "teamName" : "playerName");
      if (sortMethod === "zscore") cols.push("zscore");
      cols.push("score");
      if (detailed) {
        switch (gameMode) {
          case GameMode.OSU:
            cols.push("count100", "count50", "countMiss");
            break;
          case GameMode.TAIKO:
            cols.push("count100", "countMiss");
            break;
          case GameMode.FRUITS:
          case GameMode.MANIA:
          case GameMode.ALL:
            cols.push("accuracy");
            break;
        }
        if (!isTeam) cols.push("mods");
      }
      return cols;
      */
    });

    // Header row
    const includeOverall = combined || this.selectedSlotIndex === -1;
    let header = includeOverall ? [...overallColumns] : [];
    slots.forEach((slot, i) => {
      slotColumnsPerSlot[i].forEach(col => {
        header.push(`${slot.label} ${col}`);
      });
    });

    // Prepare slot data maps
    const slotRankingsSorted = isTeam ? this.slotTeamRankingsSorted : this.slotPlayerRankingsSorted;
    const slotRankings = isTeam ? this.slotTeamRankings : this.slotPlayerRankings;

    // For each row in overallRows, build the TSV row
    const rows = overallRows.map((row, idx) => {
      // Overall columns
      const rowData: string[] = [];
      if (includeOverall) {
        rowData.push(...overallColumns.map(col => {
          if (col === "playerName" && isTeam) col = "teamName";
          let val = (row as any)[col];
          if (col === "rankSum" && ignoreZero) {
            // Show average instead of sum
            return this.formatAvg(row.rankSum / row.numMaps);
          }
          if (col === "zscoreSum" && typeof val === "number") {
            return val.toFixed(3);
          }
          return val !== undefined ? val : "";
        }));
      }
      // Slot columns
      slots.forEach((slot, slotIdx) => {
        // Find the correct slot row for this overall row
        let slotRow;
        if (combined) {
          // Use slotRankingsSorted: sorted by overall
          slotRow = slotRankingsSorted.get(slot.label)?.[idx];
        } else {
          // Use slotRankings: sorted by slot
          slotRow = slotRankings.get(slot.label)?.[idx];
        }
        slotColumnsPerSlot[slotIdx].forEach(col => {
          if (col === "playerName" && isTeam) col = "teamName";
          let val = slotRow ? (slotRow as any)[col] : "";
          if (col === "zscore" && typeof val === "number") val = val.toFixed(3);
          if (col === "accuracy" && typeof val === "number") val = (val * 100).toFixed(2);
          if (col === "mods" && slotRow && slotRow.mods) val = this.getModsString(slotRow.mods);
          rowData.push(val !== undefined ? val : "");
        });
      });
      return rowData.join("\t");
    });

    const theText = [header.join("\t"), ...rows].join("\n");
    navigator.clipboard.writeText(theText);
    this.snackBar.open("Table copied to clipboard!", "", { duration: 3000 });
  }
}

@Component({
  selector: 'assign-seeds-dialog',
  template: `<h2 mat-dialog-title>Assign {{ data.type }} seeds</h2>
             <mat-dialog-content class="mat-typography" style="display: flex; flex-direction: column; gap: 16px;">
               Assign seeds to {{ data.type }}s based on the {{ data.method }} currently shown?

               <mat-form-field style="width: 200px;"><mat-label>Seed count</mat-label><input matInput type="number" [(ngModel)]="seedCount"></mat-form-field>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="seedCount">Yes</button>
             </mat-dialog-actions>`,
})
export class AssignSeedsDialog {
  seedCount: number = 0;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'score-details-dialog',
  template: `<h2 mat-dialog-title *ngIf="!editMode">{{ data.playerName }}'s score on {{ data.slot.label }}</h2>
             <h2 mat-dialog-title *ngIf="editMode">
               {{ data.isNew ? "Creating" : "Editing" }} {{ data.isNew ? "new" : data.playerName + "'s" }} score on {{ data.slot.label }} {{ data.isNew ? "for " + data.playerName : "" }}
             </h2>
             <mat-dialog-content class="mat-typography">
               <score-details
                 [score]="data.score"
                 [editMode]="editMode"
                 [requestInProgress]="requestInProgress"
                 (edit)="submitEdit($event)"
                 (cancel)="toggleEdit()"
               >
               </score-details>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;" *ngIf="!editMode">
               <button *ngIf="data.canEdit" mat-raised-button color="primary" (click)="toggleEdit()" [disabled]="requestInProgress">Edit</button>
               <button *ngIf="data.canEdit" mat-raised-button color="warn" (click)="delete()" [disabled]="requestInProgress">Delete</button>
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">Close</button>
             </mat-dialog-actions>`,
})
export class ScoreDetailsDialog implements OnInit {
  editMode: boolean = false;
  requestInProgress: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { slot: MappoolSlot, score: Score, playerName: string, isNew: boolean, canEdit: boolean, acronym: string, roundId: string, slotScoresheetId: string, playerOrTeamId: string },
    private dialogRef: MatDialogRef<ScoreDetailsDialog>,
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    if (this.data.isNew) {
      this.editMode = true;
    }
  }

  toggleEdit() {
    if (this.data.isNew) {
      this.dialogRef.close();
    }
    this.editMode = !this.editMode;
  }

  delete() {
    // nahh i ain't makin a dialog within a dialog lol
    if (window.confirm("Delete this score?")) {
      this.requestInProgress = true;
      const request = this.tournamentsService.deleteScore(this.data.acronym, this.data.roundId, this.data.slotScoresheetId, this.data.score._id);
      request.pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        this.snackBar.open("Successfully deleted score.", "", { duration: 10000 });
        this.dialogRef.close({ delete: true, _id: this.data.score._id });
      });;
    }
  }

  async submitEdit(updatedScore: Score) {
    this.requestInProgress = true;

    let request: Observable<Score>;
    let successMessage = "";
    if (this.data.isNew) {
      request = this.tournamentsService.createScore(this.data.acronym, this.data.roundId, this.data.slotScoresheetId, this.data.playerOrTeamId, updatedScore);
      successMessage = "Successfully added score.";
    } else {
      request = this.tournamentsService.editScore(this.data.acronym, this.data.roundId, this.data.slotScoresheetId, this.data.score._id, updatedScore);
      successMessage = "Successfully edited score.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedScore) => {
      this.requestInProgress = false;
      this.snackBar.open(successMessage, "", { duration: 10000 });
      this.dialogRef.close(updatedScore);
    });;
  }
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ItemSelectorModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    NavBarModule,
    ReactiveFormsModule,
    TournamentRoundNavBarModule,
    HovercardModule,
    ScoreDetailsModule,
  ],
  declarations: [ TournamentStatsPage, AssignSeedsDialog, ScoreDetailsDialog ],
  exports: [ TournamentStatsPage ],
  bootstrap: [ TournamentStatsPage ]
})
export class TournamentStatsPageModule {}