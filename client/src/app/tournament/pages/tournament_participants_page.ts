import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Inject, inject, NgModule, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { catchError, finalize, switchMap, take } from 'rxjs/operators';
import { Observable, throwError } from "rxjs";

import { AppUser, GameMode, Tournament, TournamentPlayer, TournamentProgress, TournamentStaffMember, TournamentStaffPermission, TournamentTeam } from 'src/app/models/models';
import { NavBarModule } from "src/app/nav_bar/nav_bar";
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentPlayerCardModule } from 'src/app/tournament/components/tournament_player_card';
import { TournamentPlayerEditorModule } from '../components/tournament_player_editor';
import { TournamentTeamCardModule } from 'src/app/tournament/components/tournament_team_card';
import { TournamentTeamEditorModule } from "../components/tournament_team_editor";
import { TournamentStaffMemberCardModule } from 'src/app/tournament/components/tournament_staff_member_card';
import { RefreshPlayerDataDialog } from './tournament_settings_page';
import { AuthService } from 'src/app/services/auth.service';
import { AssignSeedsDialog } from './tournament_stats_page';
import { TournamentTeamEditor } from '../components/tournament_team_editor';

@Component({
  selector: 'tournament_participants_page',
  templateUrl: './tournament_participants_page.html',
  styleUrls: ['./tournament_participants_page.scss']
})
export class TournamentParticipantsPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loadingTournament = true;
  appUser?: AppUser;
  requestInProgress = false;
  players: TournamentPlayer[] = [];
  teams: TournamentTeam[] = [];
  staffMembers: TournamentStaffMember[] = [];
  sortMethodFormControl: FormControl;
  filterFormControl: FormControl;
  displayFormControl: FormControl;
  mobileMode = false;

  TournamentStaffPermission = TournamentStaffPermission;
  GameMode = GameMode;

  readonly dialogService = inject(MatDialog);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver,
    private snackBar: MatSnackBar,
    private titleService: Title) {
      this.sortMethodFormControl = new FormControl("rank");
      this.filterFormControl = new FormControl("");
      this.displayFormControl = new FormControl("players");
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
      this.titleService.setTitle(`${tournament.name} Participants`);
      
      this.sortPlayers();
      this.sortTeams();
      this.sortStaffMembers();
      this.filterStaffMembers();
    });
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
    this.authService.appUser$.subscribe((user) => this.appUser = user);
  }

  private playerNameCompare = (a: TournamentPlayer|TournamentStaffMember, b: TournamentPlayer|TournamentStaffMember) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1;
  private teamNameCompare = (a: TournamentTeam, b: TournamentTeam) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  private countryCompare = (a: TournamentPlayer, b: TournamentPlayer) => {
    const ac = a.country?.toLowerCase() ?? "";
    const bc = b.country?.toLowerCase() ?? "";
    if (ac === bc) return 0;
    else return ac < bc ? -1 : 1;
  };
  private seedCompare = (a: TournamentPlayer|TournamentTeam, b: TournamentPlayer|TournamentTeam) => {
    const aSeed = a.seed ? parseInt(a.seed) : Number.MAX_SAFE_INTEGER;
    const bSeed = b.seed ? parseInt(b.seed) : Number.MAX_SAFE_INTEGER;
    if (!isNaN(aSeed) && !isNaN(bSeed) && aSeed !== bSeed) return aSeed - bSeed;
    if (a.seed === "" && b.seed === "") return 0;
    if (a.seed === "") return 1;
    if (b.seed === "") return -1;
    else return (a.seed ?? "").localeCompare(b.seed ?? "");
  }

  sortPlayers() {
    if (this.sortMethodFormControl.value === "name") {
      this.players = [...this.tournament!.players].sort(this.playerNameCompare);
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.players = [...this.tournament!.players].sort((a,b) => this.countryCompare(a,b) || this.playerNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.players = [...this.tournament!.players].sort((a,b) => this.seedCompare(a,b) || this.playerNameCompare(a,b));
    }
    // sort by rank by default
    else {
      this.players = [...this.tournament!.players].sort((a,b) => (a.taikoRank ?? 2147483647) - (b.taikoRank ?? 2147483647));
    }
  }

  sortTeams() {
    if (this.sortMethodFormControl.value === "name") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.teamNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.countryCompare(a.players[0], b.players[0]) || this.teamNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.seedCompare(a, b) || this.teamNameCompare(a,b));
    }
    // sort by average rank by default
    else {
      this.teams = [...this.tournament!.teams].sort(
        (a,b) => (a.players.reduce((acc, player) => acc + player.taikoRank, 0) / a.players.length) - (b.players.reduce((acc, player) => acc + player.taikoRank, 0) / b.players.length));
    }
  }

  sortStaffMembers() {
    this.staffMembers = [...this.tournament!.staffMembers].sort((a,b) => this.playerNameCompare(a,b));
  }

  filterStaffMembers() {
    if (this.filterFormControl.value) {
      this.staffMembers = [...this.staffMembers].filter((staffMember) => staffMember.roles.some((role) => role.name === this.filterFormControl.value));
    } else {
      this.staffMembers = [...this.staffMembers];
    }
  }
  
  switchSortMethod(changeEvent: MatSelectChange) {
    this.sortPlayers();
    this.sortTeams();
    this.sortStaffMembers();
    this.filterStaffMembers();
  }

  get participantsCountText() {
    switch(this.displayFormControl.value) {
      case "players":
        return `${this.players.length} Players`;
      case "teams":
        return `${this.teams.length} Teams`;
      case "staff":
        return `${this.staffMembers.length} Staff Members`;
      default:
        return "";
    }
  }

  getPlayerTeams(playerId: number) {
    return this.teams.filter((team) => team.players.some(player => player.playerId === playerId));
  }

  get currentStaffMember() {
    return this.tournament?.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId);
  }

  hasPermission(permission: TournamentStaffPermission) {
    return (this.appUser && this.appUser.osuId === this.tournament?.ownerId) ||
            (this.currentStaffMember && this.currentStaffMember.roles.some((role) => role.permissions.includes(permission)));
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }

  openPlayerEditor() {
    const dialogRef = this.dialogService.open(
      PlayerTeamEditorDialog, { data: { type: "Player", acronym: this.acronym, players: this.tournament!.players, gameMode: this.tournament!.gameMode } }
    );
    dialogRef.afterClosed().subscribe((updatedPlayers: TournamentPlayer[]) => {
      if (updatedPlayers) {
        this.tournament!.players = updatedPlayers;
        this.sortPlayers();
      }
    });
  }

  openTeamEditor() {
    const dialogRef = this.dialogService.open(
      PlayerTeamEditorDialog, { data: { type: "Team", acronym: this.acronym, players: this.tournament!.players, teams: this.tournament!.teams, gameMode: this.tournament!.gameMode } }
    );
    dialogRef.afterClosed().subscribe((updatedTeams: TournamentTeam[]) => {
      if (updatedTeams) {
        this.tournament!.teams = updatedTeams;
        this.sortTeams();
      }
    });
  }

  copyCSV() {
    let csv = "";
    const playersSortedById = [...this.players].sort((a,b) => a.playerId - b.playerId);
    if (this.displayFormControl.value === "players") {
      playersSortedById.forEach((player) => {
        csv += `${player.username},${player.playerId}\n`;
      });
    } else if (this.displayFormControl.value === "teams") {
      playersSortedById.forEach((player) => {
        csv += `${player.username},${this.getPlayerTeams(player.playerId)[0]?.name || ''},${player.playerId}\n`;
      });
    }
    navigator.clipboard.writeText(csv);
    this.snackBar.open("Copied player data csv to clipboard.", "", { duration: 10000 });
  }

  refreshPlayerData() {
    const dialogRef = this.dialogService.open(RefreshPlayerDataDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.refreshPlayers(this.acronym)
          .pipe(catchError((error) => {
            this.requestInProgress = false;
            this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
            return throwError(error);
          })).subscribe((result: any) => {
            this.requestInProgress = false;
            if (result.statusCode === 207 && result.message) {
              this.snackBar.open("Player data refreshed. " + result.message, "", { duration: 20000 });
            } else {
              this.snackBar.open("Player data refreshed.", "", { duration: 10000 });
            }
          });
      }
    });
  }

  assignSeeds() {
    const dialogRef = this.dialogService.open(AssignSeedsDialog, { data: { type: "players", method: "player ranks" } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const seedsToAssign = this.players.map((player, index) => ({ playerId: player.playerId, seed: (index + 1).toString() })).filter((entry) => entry.seed <= result);
        this.tournamentsService.batchAssignPlayerSeeds(this.tournament!.acronym, { playerSeeds: seedsToAssign }).subscribe(() => {
          this.snackBar.open("Player seeds assigned.", "", { duration: 10000 });
        });
      }
    });
  }
}

@Component({
  selector: 'player-team-editor-dialog',
  template: `<h2 mat-dialog-title>{{ data.type }} editor</h2>
             <mat-dialog-content class="mat-typography">
               <ng-container *ngIf="data.type === 'Player'">
                 <form [formGroup]="playerEditorForm" class="tourney-form">
                   <mat-form-field>
                     <mat-label>Player</mat-label>
                     <mat-select formControlName="selectedPlayer" (selectionChange)="switchSelectedPlayer($event.value)">
                       <mat-option value="-1">&lt;New&gt;</mat-option>
                       <mat-option *ngFor="let player of sortedPlayers" [value]="player.playerId">{{ player.username }}</mat-option>
                     </mat-select>
                   </mat-form-field>
                 </form>
                 <tournament-player-editor
                   [player]="selectedPlayer"
                   [requestInProgress]="requestInProgress"
                   [gameMode]="data.gameMode"
                   (submit)="submitUpdatePlayerForm($event)"
                   (remove)="removePlayer($event)"
                   (refresh)="refreshPlayerData($event)">
                 </tournament-player-editor>
               </ng-container>
               <ng-container *ngIf="data.type === 'Team'">
                 <form [formGroup]="teamEditorForm" class="tourney-form">
                   <mat-form-field>
                     <mat-label>Team</mat-label>
                     <mat-select formControlName="selectedTeam" (selectionChange)="switchSelectedTeam($event.value)">
                       <mat-option value="-1">&lt;New&gt;</mat-option>
                       <mat-option *ngFor="let team of sortedTeams" [value]="team._id">{{ team.name }}</mat-option>
                     </mat-select>
                   </mat-form-field>
                 </form>
                 <tournament-team-editor
                   [team]="selectedTeam"
                   [players]="workingPlayers"
                   [requestInProgress]="requestInProgress"
                   (submit)="submitUpdateTeamForm($event)"
                   (remove)="removeTeam($event)"
                   (uploadImage)="uploadTeamImage($event)">
                 </tournament-team-editor>
               </ng-container>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Player'" [mat-dialog-close]="workingPlayers">Close</button>
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Team'" [mat-dialog-close]="workingTeams">Close</button>
             </mat-dialog-actions>`,
})
export class PlayerTeamEditorDialog {
  requestInProgress: boolean = false;

  selectedPlayer?: TournamentPlayer;
  selectedPlayerIndex = -1;
  playerEditorForm: FormGroup;
  selectedPlayerFormControl: FormControl;
  workingPlayers: TournamentPlayer[] = [];

  selectedTeam?: TournamentTeam;
  selectedTeamIndex = -1;
  teamEditorForm: FormGroup;
  selectedTeamFormControl: FormControl;
  workingTeams: TournamentTeam[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { type: "Player" | "Team", acronym: string, gameMode: GameMode, players: TournamentPlayer[], teams: TournamentTeam[] },
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<PlayerTeamEditorDialog>
  ) {
    this.selectedPlayerFormControl = new FormControl("-1");
    this.playerEditorForm = new FormGroup({
      selectedPlayer: this.selectedPlayerFormControl,
    });

    this.selectedTeamFormControl = new FormControl("-1");
    this.teamEditorForm = new FormGroup({
      selectedTeam: this.selectedTeamFormControl,
    });

    this.dialogRef.backdropClick().subscribe(() => {
      if (this.data.type === "Player") {
        this.dialogRef.close(this.workingPlayers);
      } else {
        this.dialogRef.close(this.workingTeams);
      }
    });
  }

  ngOnInit() {
    this.workingPlayers = [...this.data.players];
    this.workingTeams = [...this.data.teams];
  }

  get sortedPlayers(): TournamentPlayer[] {
    return [...this.workingPlayers].sort((a,b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
  }

  get sortedTeams(): TournamentTeam[] {
    return [...this.workingTeams].sort((a,b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  }

  switchSelectedPlayer(playerId: number) {
    const index = this.workingPlayers.findIndex((player) => player.playerId === playerId);
    this.selectedPlayerIndex = index;
    if (index < 0) this.selectedPlayer = undefined;
    else this.selectedPlayer = this.workingPlayers[index];
  }
  
  switchSelectedTeam(teamId: string) {
    const index = this.workingTeams.findIndex((team) => team._id === teamId);
    this.selectedTeamIndex = index;
    if (index < 0) this.selectedTeam = undefined;
    else this.selectedTeam = this.workingTeams[index];
  }

  submitUpdatePlayerForm(partialPlayer: Partial<TournamentPlayer>) {
    if (!partialPlayer.playerId) return;
    this.requestInProgress = true;

    let request: Observable<TournamentPlayer>;
    let successMessage = "";
    if (!this.selectedPlayer) {
      request = this.tournamentsService.addTournamentPlayer(this.data.acronym, partialPlayer.playerId, partialPlayer);
      successMessage = "Successfully added {} as tournament player.";
    } else {
      request = this.tournamentsService.editTournamentPlayer(this.data.acronym, this.selectedPlayer.playerId, partialPlayer);
      successMessage = "Successfully edited tournament player.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentPlayer) => {
      this.requestInProgress = false;
      if (!this.selectedPlayer) {
        this.workingPlayers.push(updatedTournamentPlayer);
      } else {
        this.workingPlayers[this.selectedPlayerIndex] = updatedTournamentPlayer;
        this.selectedPlayer = updatedTournamentPlayer;
      }
      this.snackBar.open(successMessage.replace("{}", updatedTournamentPlayer.username), "", { duration: 10000 });
    });
  }

  submitUpdateTeamForm(partialTeam: Partial<TournamentTeam>) {
    if (!partialTeam.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentTeam>;
    let successMessage = "";
    if (!this.selectedTeam) {
      request = this.tournamentsService.addTournamentTeam(this.data.acronym, partialTeam);
      successMessage = "Successfully added {} as tournament team.";
    } else {
      request = this.tournamentsService.editTournamentTeam(this.data.acronym, this.selectedTeam._id, partialTeam);
      successMessage = "Successfully edited tournament team.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentTeam) => {
      this.requestInProgress = false;
      if (!this.selectedTeam) {
        this.workingTeams.push(updatedTournamentTeam);
      } else {
        this.workingTeams[this.selectedTeamIndex] = updatedTournamentTeam;
        this.selectedTeam = updatedTournamentTeam;
      }
      this.snackBar.open(successMessage.replace("{}", updatedTournamentTeam.name), "", { duration: 10000 });
    });
  }

  removePlayer(player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentPlayer(this.data.acronym, player.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingPlayers.findIndex((player2) => player2.playerId === player.playerId);
        if (index !== undefined) this.workingPlayers.splice(index, 1);
        this.selectedPlayerFormControl.setValue("-1");
        this.switchSelectedPlayer(-1);
        this.snackBar.open("Successfully removed tournament player.", "", { duration: 10000 });
      });
  }

  removeTeam(team: TournamentTeam) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentTeam(this.data.acronym, team._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingTeams.findIndex((team2) => team2._id === team._id);
        if (index !== undefined) this.workingTeams.splice(index, 1);
        this.selectedTeamFormControl.setValue("-1");
        this.switchSelectedTeam("");
        this.snackBar.open("Successfully removed tournament team.", "", { duration: 10000 });
      });
  }

  refreshPlayerData(player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.refreshPlayer(this.data.acronym, player.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((refreshedPlayer) => {
        this.requestInProgress = false;
        const index = this.workingPlayers.findIndex((p) => p.playerId === refreshedPlayer.playerId);
        this.workingPlayers[index] = refreshedPlayer;
        this.selectedPlayer = refreshedPlayer;
        this.snackBar.open("Player data refreshed.", "", { duration: 10000 });
      });
  }

  uploadTeamImage(event: any) {
    this.requestInProgress = true;
    const teamId = this.selectedTeam!._id;
    this.tournamentsService.uploadTeamImage(this.data.acronym, teamId, event)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedTournamentTeam) => {
        this.requestInProgress = false;
        this.workingTeams[this.selectedTeamIndex] = updatedTournamentTeam;
        this.selectedTeam = updatedTournamentTeam;
        this.snackBar.open("Successfully updated team image.", "", { duration: 10000 });
      });
  }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        NavBarModule,
        ReactiveFormsModule,
        TournamentPlayerCardModule,
        TournamentPlayerEditorModule,
        TournamentTeamCardModule,
        TournamentTeamEditorModule,
        TournamentStaffMemberCardModule,
    ],
  declarations: [ TournamentParticipantsPage, PlayerTeamEditorDialog ],
  exports: [ TournamentParticipantsPage ],
  bootstrap: [ TournamentParticipantsPage ]
})
export class TournamentParticipantsPageModule {}
