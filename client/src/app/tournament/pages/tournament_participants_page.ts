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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { catchError, finalize, switchMap, take } from 'rxjs/operators';
import { Observable, throwError } from "rxjs";
import { hasPermission, playerNameCompare, teamNameCompare, countryCompare, seedCompare, getRankCompare, getRolesSortedByPermission, getStaffMemberListSortedByRole, getPlayerRank } from '../utils';

import { AppUser, GameMode, Tournament, TournamentPlayer, TournamentProgress, TournamentStaffMember, TournamentStaffPermission, TournamentStaffRole, TournamentTeam } from 'src/app/models/models';
import { HovercardModule } from 'src/app/components/hovercard';
import { NavBarModule } from "src/app/nav_bar/nav_bar";
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentPlayerCard, TournamentPlayerCardModule } from 'src/app/tournament/components/tournament_player_card';
import { TournamentPlayerEditorModule } from '../components/tournament_player_editor';
import { TournamentTeamCard, TournamentTeamCardModule } from 'src/app/tournament/components/tournament_team_card';
import { TournamentTeamEditorModule } from "../components/tournament_team_editor";
import { TournamentStaffMemberCard, TournamentStaffMemberCardModule } from 'src/app/tournament/components/tournament_staff_member_card';
import { TournamentStaffMemberEditorModule } from '../components/tournament_staff_member_editor';
import { TournamentStaffRoleEditorModule } from '../components/tournament_staff_role_editor';
import { RefreshPlayerDataDialog } from './tournament_settings_page';
import { AuthService } from 'src/app/services/auth.service';
import { AssignSeedsDialog } from './tournament_stats_page';
import { TournamentPlayerLabelModule } from '../components/tournament_player_label';
import { TournamentTeamLabelModule } from '../components/tournament_team_label';

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
  staffSortMethodFormControl: FormControl;
  filterFormControl: FormControl;
  displayFormControl: FormControl;
  playerSortFormControl: FormControl
  playerFlagsFormControl: FormControl;
  tableViewFormControl: FormControl;
  displayByStaffRoleFormControl: FormControl;
  mobileMode = false;

  TournamentPlayerCard = TournamentPlayerCard;
  TournamentTeamCard = TournamentTeamCard;
  TournamentStaffMemberCard = TournamentStaffMemberCard;
  TournamentStaffPermission = TournamentStaffPermission;
  GameMode = GameMode;

  readonly dialogService = inject(MatDialog);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private translocoService: TranslocoService) {
      this.sortMethodFormControl = new FormControl("rank");
      this.staffSortMethodFormControl = new FormControl("default");
      this.filterFormControl = new FormControl("");
      this.displayFormControl = new FormControl("players");
      this.playerSortFormControl = new FormControl("rank");
      this.playerFlagsFormControl = new FormControl(false);
      this.tableViewFormControl = new FormControl(false);
      this.displayByStaffRoleFormControl = new FormControl(false);
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

  sortPlayers() {
    if (this.sortMethodFormControl.value === "name") {
      this.players = [...this.tournament!.players].sort(playerNameCompare);
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.players = [...this.tournament!.players].sort((a,b) => countryCompare(a,b) || playerNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.players = [...this.tournament!.players].sort((a,b) => seedCompare(a,b) || playerNameCompare(a,b));
    }
    // sort by rank by default
    else {
      this.players = [...this.tournament!.players].sort(getRankCompare(this.tournament!.gameMode));
    }
  }

  sortTeams() {
    if (this.sortMethodFormControl.value === "name") {
      this.teams = [...this.tournament!.teams].sort(teamNameCompare);
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.teams = [...this.tournament!.teams].sort((a,b) => countryCompare(a.players[0], b.players[0]) || teamNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.teams = [...this.tournament!.teams].sort((a,b) => seedCompare(a, b) || teamNameCompare(a,b));
    }
    // sort by average rank by default
    else {
      this.teams = [...this.tournament!.teams].sort(
        (a,b) => (a.players.reduce((acc, player) => acc + (this.getPlayerRank(player) ?? 0), 0) / a.players.length) - (b.players.reduce((acc, player) => acc + (this.getPlayerRank(player) ?? 0), 0) / b.players.length));
    }
  }

  sortStaffMembers() {
    if (this.staffSortMethodFormControl.value === "name") {
      this.staffMembers = [...this.tournament!.staffMembers].sort(playerNameCompare);
    } else {
      this.staffMembers = getStaffMemberListSortedByRole(this.tournament!.staffMembers);
    }
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

  get playerColumns() {
    return this.tournament!.enableTeams ? ['name', 'team', 'rank', 'seed', 'playerId', 'discord', 'timezone'] : ['name', 'rank', 'seed', 'playerId', 'discord', 'timezone'];
  }

  get teamColumns() {
    return ['name', 'players', 'rank', 'seed'];
  }

  get staffMemberColumns() {
    return ['name', 'roles'];
  }

  getPlayerTeams(playerId: number) {
    return this.teams.filter((team) => team.players.some(player => player.playerId === playerId));
  }

  getPlayerRank(player: TournamentPlayer) {
    return getPlayerRank(player, this.tournament!.gameMode);
  }

  getPlayerRankDisplay(player: TournamentPlayer) {
    const rank = this.getPlayerRank(player);
    return rank === Number.MAX_SAFE_INTEGER ? "Unranked" : `#${rank}`;
  }

  getPlayerTimezone(player: TournamentPlayer) {
    return player.appUser?.timezone !== undefined ? (player.appUser?.timezone >= 0 ? `+${player.appUser?.timezone}` : `${player.appUser?.timezone}`) : "";
  }

  getTeamCaptain(team: TournamentTeam) {
    return team.players[0];
  }

  getTeamAvgRank(team: TournamentTeam) {
    return (team.players.reduce((acc, player) => acc + (this.getPlayerRank(player) ?? 0), 0) / team.players.length);
  }

  getSortedTeamPlayers(team: TournamentTeam) {
    const playersClone = [...team.players];
    switch (this.playerSortFormControl.value) {
      case "seed": return playersClone.sort(seedCompare);
      case "name": return playersClone.sort(playerNameCompare);
      case "rank": return playersClone.sort(getRankCompare(this.tournament!.gameMode));
      default: return team.players;
    }
  }

  get sortedStaffRoles() {
    if (this.staffSortMethodFormControl.value === "name") {
      return [...this.tournament!.staffRoles].sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    } else {
      return getRolesSortedByPermission(this.tournament!.staffRoles);
    }
  }

  getStaffMembersWithRole(roleId: string) {
    return this.staffMembers.filter((staffMember) => staffMember.roles.some((role) => role._id === roleId)).sort(playerNameCompare);
  }

  copyTable() {
    let header: string[] = [];
    let rows: string[] = [];
    switch (this.displayFormControl.value) {
      case "players": {
        header = ['Name', 'Team', 'Rank', 'Seed', 'Player ID', 'Discord', 'Timezone'];
        rows = this.players.map(player => {
          const teamNames = this.getPlayerTeams(player.playerId).map(team => team.name).join(", ");
          return [player.username, teamNames, this.getPlayerRankDisplay(player), player.seed || "", player.playerId, player.appUser?.discordUsername || "", this.getPlayerTimezone(player)].join('\t');
        });
        break;
      }
      case "teams": {
        header = ['Name', 'Players', 'Avg Rank', 'Seed'];
        rows = this.teams.map(team => {
          const playerNames = this.getSortedTeamPlayers(team).map(player => player.username).join(", ");
          const avgRank = this.getTeamAvgRank(team).toFixed();
          return [team.name, playerNames, avgRank, team.seed || ""].join('\t');
        });
        break;
      };
      case "staff": {
        header = ['Name', 'Roles'];
        rows = this.staffMembers.map(staffMember => {
          const roleNames = staffMember.roles.map(role => role.name).join(", ");
          return [staffMember.username, roleNames].join('\t');
        });
        break;
      };
    }
    const theText = [header.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(theText);
    this.snackBar.open(this.translocoService.translate("tournament.common.tableCopied"), '', { duration: 3000 });
  }

  get currentStaffMember() {
    return this.tournament?.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId);
  }

  hasPermission(permission: TournamentStaffPermission) {
    return hasPermission(this.tournament!, this.appUser?.osuId, permission);
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }

  openPlayerEditor() {
    const dialogRef = this.dialogService.open(
      EditorDialog, { data: { type: "Player", acronym: this.acronym, players: this.tournament!.players, teams: this.tournament!.teams, gameMode: this.tournament!.gameMode } }
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
      EditorDialog, { data: { type: "Team", acronym: this.acronym, players: this.tournament!.players, teams: this.tournament!.teams, gameMode: this.tournament!.gameMode } }
    );
    dialogRef.afterClosed().subscribe((updatedTeams: TournamentTeam[]) => {
      if (updatedTeams) {
        this.tournament!.teams = updatedTeams;
        this.sortTeams();
      }
    });
  }

  openStaffMemberEditor() {
    const dialogRef = this.dialogService.open(
      EditorDialog, { data: { type: "Staff Member", acronym: this.acronym, gameMode: this.tournament!.gameMode, staffMembers: this.tournament!.staffMembers, staffRoles: this.tournament!.staffRoles } }
    );
    dialogRef.afterClosed().subscribe((updatedStaffMembers: TournamentStaffMember[]) => {
      if (updatedStaffMembers) {
        this.tournament!.staffMembers = updatedStaffMembers;
        this.sortStaffMembers();
        this.filterStaffMembers();
      }
    });
  }

  openStaffRoleEditor() {
    const dialogRef = this.dialogService.open(
      EditorDialog, { data: { type: "Staff Role", acronym: this.acronym, gameMode: this.tournament!.gameMode, staffRoles: this.tournament!.staffRoles } }
    );
    dialogRef.afterClosed().subscribe((updatedStaffRoles: TournamentStaffRole[]) => {
      if (updatedStaffRoles) {
        this.tournament!.staffRoles = updatedStaffRoles;
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
    this.snackBar.open(this.translocoService.translate("tournament.participants.playerCsvCopied"), "", { duration: 10000 });
  }

  refreshAllPlayerData() {
    const dialogRef = this.dialogService.open(RefreshPlayerDataDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.refreshPlayers(this.acronym)
          .pipe(catchError((error) => {
            this.requestInProgress = false;
            this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
            return throwError(error);
          })).subscribe((result: any) => {
            this.requestInProgress = false;
            if (result.statusCode === 207 && result.message) {
              this.snackBar.open(this.translocoService.translate("tournament.settings.playerDataRefreshed") + " " + result.message, "", { duration: 20000 });
            } else {
              this.snackBar.open(this.translocoService.translate("tournament.settings.playerDataRefreshed"), "", { duration: 10000 });
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
          this.snackBar.open(this.translocoService.translate("tournament.participants.playerSeedsAssigned"), "", { duration: 10000 });
        });
      }
    });
  }
}

@Component({
  selector: 'editor-dialog',
  template: `<h2 mat-dialog-title>{{ data.type }} Editor</h2>
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
               <ng-container *ngIf="data.type === 'Staff Member'">
                 <form [formGroup]="staffMemberEditorForm" class="tourney-form">
                   <mat-form-field>
                     <mat-label>Team</mat-label>
                     <mat-select formControlName="selectedStaffMember" (selectionChange)="switchSelectedStaffMember($event.value)">
                       <mat-option value="-1">&lt;New&gt;</mat-option>
                       <mat-option *ngFor="let staffMember of sortedStaffMembers" [value]="staffMember._id">{{ staffMember.username }}</mat-option>
                     </mat-select>
                   </mat-form-field>
                 </form>
                 <tournament-staff-member-editor
                   [staffMember]="selectedStaffMember"
                   [staffRoles]="data.staffRoles"
                   [requestInProgress]="requestInProgress"
                   (submit)="submitUpdateStaffMemberForm($event)"
                   (remove)="removeStaffMember($event)">
                 </tournament-staff-member-editor>
               </ng-container>
               <ng-container *ngIf="data.type === 'Staff Role'">
                 <form [formGroup]="staffRoleEditorForm" class="tourney-form">
                   <mat-form-field>
                     <mat-label>Role</mat-label>
                     <mat-select formControlName="selectedStaffRole" (selectionChange)="switchSelectedStaffRole($event.value)">
                       <mat-option value="-1">&lt;New&gt;</mat-option>
                       <mat-option *ngFor="let staffRole of data.staffRoles" [value]="staffRole._id">{{ staffRole.name }}</mat-option>
                     </mat-select>
                   </mat-form-field>
                 </form>
                 <tournament-staff-role-editor
                   [staffRole]="selectedStaffRole"
                   [requestInProgress]="requestInProgress"
                   (submit)="submitUpdateStaffRoleForm($event)"
                   (remove)="removeStaffRole($event)">
                 </tournament-staff-role-editor>
               </ng-container>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Player'" [mat-dialog-close]="workingPlayers">Close</button>
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Team'" [mat-dialog-close]="workingTeams">Close</button>
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Staff Member'" [mat-dialog-close]="workingStaffMembers">Close</button>
               <button mat-raised-button color="secondary" *ngIf="data.type === 'Staff Role'" [mat-dialog-close]="workingStaffRoles">Close</button>
             </mat-dialog-actions>`,
})
export class EditorDialog {
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

  selectedStaffMember?: TournamentStaffMember;
  selectedStaffMemberIndex = -1;
  staffMemberEditorForm: FormGroup;
  selectedStaffMemberFormControl: FormControl;
  workingStaffMembers: TournamentStaffMember[] = [];

  selectedStaffRole?: TournamentStaffRole;
  selectedStaffRoleIndex = -1;
  staffRoleEditorForm: FormGroup;
  selectedStaffRoleFormControl: FormControl;
  workingStaffRoles: TournamentStaffRole[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { type: "Player" | "Team" | "Staff Member" | "Staff Role", acronym: string, gameMode: GameMode, players: TournamentPlayer[], teams: TournamentTeam[], staffMembers: TournamentStaffMember[], staffRoles: TournamentStaffRole[] },
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EditorDialog>,
    private translocoService: TranslocoService
  ) {
    this.selectedPlayerFormControl = new FormControl("-1");
    this.playerEditorForm = new FormGroup({
      selectedPlayer: this.selectedPlayerFormControl,
    });

    this.selectedTeamFormControl = new FormControl("-1");
    this.teamEditorForm = new FormGroup({
      selectedTeam: this.selectedTeamFormControl,
    });
    
    this.selectedStaffMemberFormControl = new FormControl("-1");
    this.staffMemberEditorForm = new FormGroup({
      selectedStaffMember: this.selectedStaffMemberFormControl,
    });

    this.selectedStaffRoleFormControl = new FormControl("-1");
    this.staffRoleEditorForm = new FormGroup({
      selectedStaffRole: this.selectedStaffRoleFormControl,
    });

    this.dialogRef.backdropClick().subscribe(() => {
      if (this.data.type === "Player") {
        this.dialogRef.close(this.workingPlayers);
      } else if (this.data.type === "Team") {
        this.dialogRef.close(this.workingTeams);
      } else if (this.data.type === "Staff Member") {
        this.dialogRef.close(this.workingStaffMembers);
      } else if (this.data.type === "Staff Role") {
        this.dialogRef.close(this.workingStaffRoles);
      }
    });
  }

  ngOnInit() {
    this.workingPlayers = [...(this.data.players || [])];
    this.workingTeams = [...(this.data.teams || [])];
    this.workingStaffMembers = [...(this.data.staffMembers || [])];
    this.workingStaffRoles = [...(this.data.staffRoles || [])];
  }

  get sortedPlayers(): TournamentPlayer[] {
    return [...this.workingPlayers].sort((a,b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
  }

  get sortedTeams(): TournamentTeam[] {
    return [...this.workingTeams].sort((a,b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  }

  get sortedStaffMembers(): TournamentStaffMember[] {
    return [...this.workingStaffMembers].sort((a,b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
  }

  get sortedStaffRoles(): TournamentStaffRole[] {
    return [...this.workingStaffRoles].sort((a,b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
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

  switchSelectedStaffMember(staffMemberId: string) {
    const index = this.workingStaffMembers.findIndex((staffMember) => staffMember._id === staffMemberId);
    this.selectedStaffMemberIndex = index;
    if (index < 0) this.selectedStaffMember = undefined;
    else this.selectedStaffMember = this.workingStaffMembers[index];
  }

  switchSelectedStaffRole(staffRoleId: string) {
    const index = this.workingStaffRoles.findIndex((staffRole) => staffRole._id === staffRoleId);
    this.selectedStaffRoleIndex = index;
    if (index < 0) this.selectedStaffRole = undefined;
    else this.selectedStaffRole = this.workingStaffRoles[index];
  }

  submitUpdatePlayerForm(partialPlayer: Partial<TournamentPlayer>) {
    if (!partialPlayer.playerId) return;
    this.requestInProgress = true;

    let request: Observable<TournamentPlayer>;
    let successMessage = "";
    if (!this.selectedPlayer) {
      request = this.tournamentsService.addTournamentPlayer(this.data.acronym, partialPlayer.playerId, partialPlayer);
      successMessage = "tournament.settings.addedPlayer";
    } else {
      request = this.tournamentsService.editTournamentPlayer(this.data.acronym, this.selectedPlayer.playerId, partialPlayer);
      successMessage = "tournament.settings.editedPlayer";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentPlayer) => {
      this.requestInProgress = false;
      if (!this.selectedPlayer) {
        this.workingPlayers.push(updatedTournamentPlayer);
      } else {
        this.workingPlayers[this.selectedPlayerIndex] = updatedTournamentPlayer;
        this.selectedPlayer = updatedTournamentPlayer;
      }
      this.snackBar.open(this.translocoService.translate(successMessage, { username: updatedTournamentPlayer.username }), "", { duration: 10000 });
    });
  }

  submitUpdateTeamForm(partialTeam: Partial<TournamentTeam>) {
    if (!partialTeam.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentTeam>;
    let successMessage = "";
    if (!this.selectedTeam) {
      request = this.tournamentsService.addTournamentTeam(this.data.acronym, partialTeam);
      successMessage = "tournament.settings.addedTeam";
    } else {
      request = this.tournamentsService.editTournamentTeam(this.data.acronym, this.selectedTeam._id, partialTeam);
      successMessage = "tournament.settings.editedTeam";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentTeam) => {
      this.requestInProgress = false;
      if (!this.selectedTeam) {
        this.workingTeams.push(updatedTournamentTeam);
      } else {
        this.workingTeams[this.selectedTeamIndex] = updatedTournamentTeam;
        this.selectedTeam = updatedTournamentTeam;
      }
      this.snackBar.open(this.translocoService.translate(successMessage, { teamName: updatedTournamentTeam.name }), "", { duration: 10000 });
    });
  }

  submitUpdateStaffMemberForm(partialStaffMember: Partial<TournamentStaffMember>) {
    if (!partialStaffMember.playerId) return;
    this.requestInProgress = true;

    let request: Observable<TournamentStaffMember>;
    let successMessage = "";
    if (!this.selectedStaffMember) {
      request = this.tournamentsService.addTournamentStaffMember(this.data.acronym, partialStaffMember.playerId, partialStaffMember.roles || []);
      successMessage = "tournament.settings.addedStaffMember";
    } else {
      request = this.tournamentsService.editTournamentStaffMember(this.data.acronym, partialStaffMember.playerId, partialStaffMember.roles || []);
      successMessage = "tournament.settings.editedStaffMember";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentStaffMember) => {
      this.requestInProgress = false;
      if (!this.selectedStaffMember) {
        this.workingStaffMembers.push(updatedTournamentStaffMember);
      } else {
        this.workingStaffMembers[this.selectedStaffMemberIndex] = updatedTournamentStaffMember;
        this.selectedStaffMember = updatedTournamentStaffMember;
      }
      this.snackBar.open(this.translocoService.translate(successMessage, { username: updatedTournamentStaffMember.username }), "", { duration: 10000 });
    });
  }

  submitUpdateStaffRoleForm(partialStaffRole: Partial<TournamentStaffRole>) {
    if (!partialStaffRole.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentStaffRole>;
    let successMessage = "";
    if (!this.selectedStaffRole) {
      request = this.tournamentsService.addTournamentStaffRole(this.data.acronym, partialStaffRole.name, partialStaffRole.permissions || []);
      successMessage = "tournament.settings.addedStaffRole";
    } else {
      request = this.tournamentsService.editTournamentStaffRole(this.data.acronym, this.selectedStaffRole._id!, partialStaffRole.name, partialStaffRole.permissions || []);
      successMessage = "tournament.settings.editedStaffRole";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentStaffRole) => {
      this.requestInProgress = false;
      if (!this.selectedStaffRole) {
        this.workingStaffRoles.push(updatedTournamentStaffRole);
      } else {
        this.workingStaffRoles[this.selectedStaffRoleIndex] = updatedTournamentStaffRole;
        this.selectedStaffRole = updatedTournamentStaffRole;
      }
      this.snackBar.open(this.translocoService.translate(successMessage, { roleName: updatedTournamentStaffRole.name }), "", { duration: 10000 });
    });
  }

  removePlayer(player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentPlayer(this.data.acronym, player.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingPlayers.findIndex((player2) => player2.playerId === player.playerId);
        if (index !== undefined) this.workingPlayers.splice(index, 1);
        this.selectedPlayerFormControl.setValue("-1");
        this.switchSelectedPlayer(-1);
        this.snackBar.open(this.translocoService.translate("tournament.settings.removedPlayer", { username: player.username }), "", { duration: 10000 });
      });
  }

  removeTeam(team: TournamentTeam) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentTeam(this.data.acronym, team._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingTeams.findIndex((team2) => team2._id === team._id);
        if (index !== undefined) this.workingTeams.splice(index, 1);
        this.selectedTeamFormControl.setValue("-1");
        this.switchSelectedTeam("");
        this.snackBar.open(this.translocoService.translate("tournament.settings.removedTeam", { teamName: team.name }), "", { duration: 10000 });
      });
  }

  removeStaffMember(staffMember: TournamentStaffMember) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentStaffMember(this.data.acronym, staffMember.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingStaffMembers.findIndex((staffMember2) => staffMember2._id === staffMember._id);
        if (index !== undefined) this.workingStaffMembers.splice(index, 1);
        this.selectedStaffMemberFormControl.setValue("-1");
        this.switchSelectedStaffMember("");
        this.snackBar.open(this.translocoService.translate("tournament.settings.removedStaffMember", { username: staffMember.username }), "", { duration: 10000 });
      });
  }

  removeStaffRole(staffRole: TournamentStaffRole) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentStaffRole(this.data.acronym, staffRole._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingStaffRoles.findIndex((staffRole2) => staffRole2._id === staffRole._id);
        if (index !== undefined) this.workingStaffRoles.splice(index, 1);
        this.selectedStaffRoleFormControl.setValue("-1");
        this.switchSelectedStaffRole("");
        this.snackBar.open(this.translocoService.translate("tournament.settings.removedStaffRole", { roleName: staffRole.name }), "", { duration: 10000 });
      });
  }

  refreshPlayerData(player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.refreshPlayer(this.data.acronym, player.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((refreshedPlayer) => {
        this.requestInProgress = false;
        const index = this.workingPlayers.findIndex((p) => p.playerId === refreshedPlayer.playerId);
        this.workingPlayers[index] = refreshedPlayer;
        this.selectedPlayer = refreshedPlayer;
        this.snackBar.open(this.translocoService.translate("tournament.settings.playerDataRefreshed"), "", { duration: 10000 });
      });
  }

  uploadTeamImage(event: any) {
    this.requestInProgress = true;
    const teamId = this.selectedTeam!._id;
    this.tournamentsService.uploadTeamImage(this.data.acronym, teamId, event)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedTournamentTeam) => {
        this.requestInProgress = false;
        this.workingTeams[this.selectedTeamIndex] = updatedTournamentTeam;
        this.selectedTeam = updatedTournamentTeam;
        this.snackBar.open(this.translocoService.translate("tournament.registration.teamImageUpdated"), "", { duration: 10000 });
      });
  }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HovercardModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTooltipModule,
        NavBarModule,
        ReactiveFormsModule,
        TournamentPlayerCardModule,
        TournamentPlayerEditorModule,
        TournamentPlayerLabelModule,
        TournamentTeamCardModule,
        TournamentTeamEditorModule,
        TournamentTeamLabelModule,
        TournamentStaffMemberCardModule,
        TournamentStaffMemberEditorModule,
        TournamentStaffRoleEditorModule,
        TranslocoModule,
    ],
  declarations: [ TournamentParticipantsPage, EditorDialog ],
  exports: [ TournamentParticipantsPage ],
  bootstrap: [ TournamentParticipantsPage ]
})
export class TournamentParticipantsPageModule {}
