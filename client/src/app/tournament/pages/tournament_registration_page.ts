import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { combineLatest, interval, Observable, throwError } from 'rxjs';
import { finalize, switchMap, take, map, catchError } from 'rxjs/operators';

import { AppUser, GameMode, Tournament, TournamentPlayer } from 'src/app/models/models';
import { TournamentProgress, TournamentStaffPermission, TournamentTeam } from 'src/app/models/models';
import { NavBarModule } from "src/app/nav_bar/nav_bar";
import { AuthService } from 'src/app/services/auth.service';
import { TournamentPlayerCardModule } from 'src/app/tournament/components/tournament_player_card';
import { TournamentTeamCardModule } from 'src/app/tournament/components/tournament_team_card';
import { TournamentTeamEditorModule } from 'src/app/tournament/components/tournament_team_editor';
import { Title } from '@angular/platform-browser';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'tournament_registration_page',
  templateUrl: './tournament_registration_page.html',
  styleUrls: ['./tournament_registration_page.scss']
})
export class TournamentRegistrationPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loading = true;
  appUser?: AppUser;
  registrationStartCountdown$?: Observable<number>;
  registrationEndCountdown$?: Observable<number>;
  countdowns$?: Observable<{ start: number, end: number }>;
  requestInProgress = false;

  TournamentProgress = TournamentProgress;

  readonly dialogService = inject(MatDialog);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private translocoService: TranslocoService) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.acronym = params.get("acronym") || "";
        return this.tournamentsService.getTournament(this.acronym);
      }),
      take(1),
      finalize(() => {this.loading = false;}),
    ).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(`${tournament.name} Registration`);
      
      this.registrationStartCountdown$ = interval(1000).pipe(map(x => this.tournament!.registrationSettings.startDate.getTime() - Date.now()));
      this.registrationEndCountdown$ = interval(1000).pipe(map(x => this.tournament!.registrationSettings.endDate.getTime() - Date.now()));
      this.countdowns$ = combineLatest([this.registrationStartCountdown$, this.registrationEndCountdown$]).pipe(
        map((([start, end]) => ({ start, end })))
      );
    });

    this.authService.appUser$.subscribe((user) => this.appUser = user);
  }

  getTimeString(theNumber: number) {
    return `${Math.floor(theNumber / 86400000)} days, \
            ${Math.floor(theNumber / 3600000 % 24)} hours, \
            ${Math.floor(theNumber / 60000 % 60)} minutes, \
            ${Math.floor(theNumber / 1000 % 60)} seconds`;
  }

  get registrationStatus() {
    if (!this.isLoggedIn) return "tournament.registration.loginToCheck";
    if (this.isRegistered) return "tournament.registration.registered";
    return "tournament.registration.notRegistered";
  }

  get isRegistrationClosed() {
    return Date.now() < this.tournament!.registrationSettings.startDate.getTime() ||
           Date.now() > this.tournament!.registrationSettings.endDate.getTime();
  }

  get isLoggedIn() {
    return this.appUser !== undefined;
  }

  get isAllowedToRegister() {
    const staffMember = this.tournament!.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId);
    return staffMember?.roles.every(role => role.permissions.includes(TournamentStaffPermission.REGISTER)) ?? true;
  }

  get isRegistered() {
    if (this.appUser === undefined) return false;
    return !!this.selfTournamentPlayer;
  }

  get registerButtonDisabledStatus() {
    if (this.isRegistrationClosed) return true;
    if (!this.isLoggedIn) return true;
    if (this.isRegistered) return false;
    if (!this.isAllowedToRegister) return true;
    return false;
  }

  get registerButtonText() {
    if (this.isRegistrationClosed) return "tournament.registration.registrationClosed";
    if (!this.isLoggedIn) return "tournament.registration.loginToRegister";
    if (this.isRegistered) return "tournament.registration.unregister";
    if (!this.isAllowedToRegister) return "tournament.registration.staffRestricted";
    return "tournament.registration.register";
  }

  registerDialog() {
    const dialogRef = this.dialogService.open(RegisterDialog,
      {
        data: {
          unregister: this.isRegistered,
          tournamentName: this.tournament?.name,
        }
      });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.isRegistered ? this.unregister() : this.register();
    });
  }

  register() {
    this.requestInProgress = true;
    this.tournamentsService.register(this.acronym)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
          return throwError(error);
        })).subscribe((tournamentPlayer) => {
          this.tournament?.players.push(tournamentPlayer);
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("tournament.registration.registeredForTournament"), "", { duration: 10000 });
        });
  }

  unregister() {
    this.requestInProgress = true;
    this.tournamentsService.unregister(this.acronym)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
          return throwError(error);
        })).subscribe(() => {
          const index = this.tournament?.players.findIndex((player) => player.playerId === this.appUser?.osuId);
          if (index !== undefined) this.tournament?.players.splice(index, 1);
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("tournament.registration.unregisteredFromTournament"), "", { duration: 10000 });
        });
  }

  // TODO: support multiple teams?
  get currentTeam() {
    if (this.appUser?.osuId) {
      return this.tournament?.teams.find((team) => team.players.map((player) => player.playerId).includes(this.appUser!.osuId));
    } else return undefined;
  }

  get currentPendingJoinRequestTeam() {
    if (this.appUser?.osuId) {
      return this.tournament?.teams.find((team) => team.joinRequests.map((player) => player.playerId).includes(this.appUser!.osuId));
    } else return undefined;
  }

  get currentPendingJoinRequests() {
    return this.currentTeam?.joinRequests ?? [];
  }

  get selfTournamentPlayer() {
    return this.tournament?.players.find((player) => player.playerId === this.appUser?.osuId);
  }

  get isTeamCaptain(): boolean {
    return this.currentTeam?.players[0].playerId === this.appUser?.osuId;
  }

  get canEditTeam(): boolean {
    return this.isTeamCaptain && (this.tournament?.progress === TournamentProgress.REGISTRATION || (this.tournament?.allowTeamEdits || false));
  }

  removePlayer(team: TournamentTeam, player: TournamentPlayer) {
    const isRemovingSelf = player.playerId === this.appUser?.osuId;
    let message = this.translocoService.translate("tournament.registration.removePlayerPrompt", { username: player.username });
    if (isRemovingSelf) {
      const isCaptain = team.players[0]?.playerId === this.appUser?.osuId;
      if (team.players.length === 1) message = this.translocoService.translate("tournament.registration.leaveYourTeamPrompt1");
      else if (isCaptain) message = this.translocoService.translate("tournament.registration.leaveYourTeamPrompt2");
    }
    
    if (window.confirm(message)) {
      this.requestInProgress = true;
      const request = isRemovingSelf ? this.tournamentsService.leaveTournamentTeam(this.acronym, team._id) :
                                       this.tournamentsService.removeTeamMember(this.acronym, team._id, player.playerId);
      const successMessage = isRemovingSelf ? this.translocoService.translate("tournament.registration.removedFromTeam", { username: player.username }) : this.translocoService.translate("tournament.registration.leftTeam");
      request.pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe((updatedTeam) => {
        this.requestInProgress = false;
        this.snackBar.open(successMessage, "", { duration: 10000 });
        const teamIndex = this.tournament?.teams.findIndex((t) => t._id === team._id);
        if (teamIndex !== undefined) {
          if (updatedTeam) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
          else this.tournament?.teams.splice(teamIndex, 1);
        }
      });
    }
  }

  transferCaptain(team: TournamentTeam, player: TournamentPlayer) {
    if (window.confirm(this.translocoService.translate("tournament.registration.transferCaptainPrompt", { username: player.username }))) {
      this.requestInProgress = true;
      const request = this.tournamentsService.transferCaptain(this.acronym, team._id, player.playerId);
      request.pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe((updatedTeam) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("tournament.registration.captainTransferred", { username: player.username }), "", { duration: 10000 });
        const teamIndex = this.tournament?.teams.findIndex((t) => t._id === team._id);
        if (teamIndex !== undefined) {
          if (updatedTeam) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
          else this.tournament?.teams.splice(teamIndex, 1);
        }
      });
    }
  }

  onFileSelected(event: any) {
    this.requestInProgress = true;
    const teamId = this.currentTeam!._id;
    this.tournamentsService.uploadTeamImage(
      this.acronym, teamId, event.target.files[0]
    ).pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
    })).subscribe((updatedTeam) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("tournament.registration.teamImageUpdated"), "", { duration: 10000 });
      const teamIndex = this.tournament?.teams.findIndex((team) => team._id === teamId);
      if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
    });
  }

  editTeamNameDialog() {
    const dialogRef = this.dialogService.open(EditTeamNameDialog, { data: { initialName: this.currentTeam?.name } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.updateTeamName(
          this.acronym, this.currentTeam!._id, result
        ).pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
          return throwError(error);
        })).subscribe((updatedTeam) => {
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("tournament.registration.teamNameUpdated"), "", { duration: 10000 });
          const teamIndex = this.tournament?.teams.findIndex((team) => team._id === updatedTeam._id);
          if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
        });
      }
    });
  }

  createTeam() {
    const dialogRef = this.dialogService.open(CreateTeamDialog);
    dialogRef.afterClosed().subscribe((result: string|undefined) => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.createTournamentTeam(this.acronym, { name: result }).pipe(
          catchError((error) => {
            this.requestInProgress = false;
            this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
            return throwError(error);
          })
        ).subscribe((createdTeam) => {
          this.requestInProgress = false;
          this.snackBar.open(this.translocoService.translate("tournament.registration.teamCreated"), "", { duration: 10000 });
          this.tournament!.teams.push(createdTeam);
        });
      }
    });
  }

  acceptTeamJoinRequest(team: TournamentTeam, player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.acceptTeamJoinRequest(this.acronym, team._id, player.playerId).pipe(
      catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })
    ).subscribe((updatedTeam) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("tournament.registration.acceptedToTeam", { username: player.username }), "", { duration: 10000 });
      const teamIndex = this.tournament?.teams.findIndex((team) => team._id === updatedTeam._id);
      if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
    });
  }

  denyTeamJoinRequest(team: TournamentTeam, player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.denyTeamJoinRequest(this.acronym, team._id, player.playerId).pipe(
      catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })
    ).subscribe((updatedTeam) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("tournament.registration.deniedFromTeam", { username: player.username }), "", { duration: 10000 });
      const teamIndex = this.tournament?.teams.findIndex((team) => team._id === updatedTeam._id);
      if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
    });
  }

  requestToJoinATeam() {
    const dialogRef = this.dialogService.open(TeamJoinRequestDialog, { data: { acronym: this.acronym, teams: this.tournament!.teams, gameMode: this.tournament!.gameMode } });
    dialogRef.afterClosed().subscribe((result: TournamentTeam|undefined) => {
      if (result) {
        const teamIndex = this.tournament!.teams.findIndex((team) => team._id === result._id);
        if (teamIndex !== undefined) this.tournament!.teams.splice(teamIndex, 1, result);
      }
    });
  }

  retractTeamJoinRequest(team: TournamentTeam) {
    this.requestInProgress = true;
    this.tournamentsService.retractTeamJoinRequest(this.acronym, team._id).pipe(
      catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })
    ).subscribe((updatedTournamentTeam) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("tournament.registration.retractedJoinRequest"), "", { duration: 10000 });
      const teamIndex = this.tournament!.teams.findIndex((team) => team._id === updatedTournamentTeam._id);
      if (teamIndex !== undefined) this.tournament!.teams.splice(teamIndex, 1, updatedTournamentTeam);
    });
  }
}

@Component({
  selector: 'register-dialog',
  template: `<h2 mat-dialog-title>{{ data.unregister ? 'Unregister from' : 'Register for' }} {{ data.tournamentName }}?</h2>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RegisterDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'edit-team-name-dialog',
  template: `<div class="dialog-wrapper">
               <h2 mat-dialog-title>{{ "tournament.registration.updateTeamName" | transloco }}</h2>
               <mat-form-field>
                 <mat-label>{{ "tournament.registration.teamName" | transloco }}</mat-label>
                 <input #teamNameInput matInput type="text" [value]="data.initialName ?? ''">
               </mat-form-field>
               <mat-dialog-actions align="end">
                 <button mat-raised-button color="primary" [mat-dialog-close]="teamNameInput.value">{{ "common.submit" | transloco }}</button>
               </mat-dialog-actions>
             </div>`,
})
export class EditTeamNameDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'create-team-dialog',
  template: `<div class="dialog-wrapper">
               <h2 mat-dialog-title>{{ "tournament.registration.createTeam" | transloco }}</h2>
               <mat-form-field>
                 <mat-label>{{ "tournament.registration.teamName" | transloco }}</mat-label>
                 <input #teamNameInput matInput type="text">
               </mat-form-field>
               <mat-dialog-actions align="end">
                 <button mat-raised-button color="primary" [mat-dialog-close]="teamNameInput.value">{{ "common.submit" | transloco }}</button>
               </mat-dialog-actions>
             </div>`,
})
export class CreateTeamDialog {
  constructor() {}
}

@Component({
  selector: 'team-join-request-dialog',
  template: `<div class="dialog-wrapper">
               <h2 mat-dialog-title>{{ "tournament.registration.requestToJoinTeam" | transloco }}</h2>
               <mat-dialog-content class="mat-typography">
                 <form [formGroup]="teamPickerForm">
                   <mat-form-field>
                     <mat-label>{{ "tournament.common.team" | transloco }}</mat-label>
                     <mat-select formControlName="selectedTeam" (selectionChange)="switchSelectedTeam($event.value)">
                       <mat-option *ngFor="let team of sortedTeams" [value]="team._id">{{ team.name }}</mat-option>
                     </mat-select>
                   </mat-form-field>
                 </form>
                 <tournament-team-card *ngIf="selectedTeam" [team]="selectedTeam" [gameMode]="data.gameMode"></tournament-team-card>
               </mat-dialog-content>
               <mat-dialog-actions align="end">
                 <button mat-raised-button color="primary" (click)="submitRequest()" [disabled]="requestInProgress || !selectedTeam">{{ "tournament.registration.request" | transloco }}</button>
               </mat-dialog-actions>
             </div>`,
})
export class TeamJoinRequestDialog {
  requestInProgress: boolean = false;

  selectedTeam?: TournamentTeam;
  teamPickerForm: FormGroup;
  selectedTeamFormControl: FormControl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { acronym: string, teams: TournamentTeam[], gameMode: GameMode },
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<TeamJoinRequestDialog>,
    private translocoService: TranslocoService,
  ) {
    this.selectedTeamFormControl = new FormControl("");
    this.teamPickerForm = new FormGroup({
      selectedTeam: this.selectedTeamFormControl,
    });
  }

  get sortedTeams(): TournamentTeam[] {
    return [...this.data.teams].sort((a,b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  }

  switchSelectedTeam(teamId: string) {
    const index = this.data.teams.findIndex((team) => team._id === teamId);
    this.selectedTeam = this.data.teams[index];
  }

  submitRequest() {
    this.requestInProgress = true;
    this.tournamentsService.requestToJoinTeam(this.data.acronym, this.selectedTeam!._id).pipe(
      catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })
    ).subscribe((updatedTournamentTeam) => {
      this.snackBar.open(this.translocoService.translate("tournament.registration.submittedJoinRequest"), "", { duration: 10000 });
      this.dialogRef.close(updatedTournamentTeam);
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
        MatInputModule,
        MatSelectModule,
        NavBarModule,
        ReactiveFormsModule,
        TournamentPlayerCardModule,
        TournamentTeamCardModule,
        TournamentTeamEditorModule,
        TranslocoModule,
    ],
  declarations: [ TournamentRegistrationPage, RegisterDialog, EditTeamNameDialog, CreateTeamDialog, TeamJoinRequestDialog ],
  exports: [ TournamentRegistrationPage ],
  bootstrap: [ TournamentRegistrationPage ]
})
export class TournamentRegistrationPageModule {}