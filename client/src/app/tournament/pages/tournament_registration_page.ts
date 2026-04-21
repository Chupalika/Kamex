import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { combineLatest, interval, Observable, throwError } from 'rxjs';
import { finalize, switchMap, take, map, catchError } from 'rxjs/operators';

import { AppUser, Tournament } from 'src/app/models/models';
import { TournamentProgress, TournamentStaffPermission, TournamentTeam } from 'src/app/models/models';
import { NavBarModule } from "src/app/nav_bar/nav_bar";
import { AuthService } from 'src/app/services/auth.service';
import { TournamentTeamCardModule } from 'src/app/tournament/components/tournament_team_card';
import { TournamentTeamEditorModule } from 'src/app/tournament/components/tournament_team_editor';
import { Title } from '@angular/platform-browser';

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
    private titleService: Title) {}

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

  getRegistrationStatus() {
    if (!this.isLoggedIn()) return "Login to check";
    if (this.isRegistered()) return "Registered";
    return "Not registered";
  }

  isRegistrationClosed() {
    return Date.now() < this.tournament!.registrationSettings.startDate.getTime() ||
           Date.now() > this.tournament!.registrationSettings.endDate.getTime();
  }

  isLoggedIn() {
    return this.appUser !== undefined;
  }

  isAllowedToRegister() {
    const staffMember = this.tournament!.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId);
    return staffMember?.roles.every(role => role.permissions.includes(TournamentStaffPermission.REGISTER)) ?? true;
  }

  isRegistered() {
    if (this.appUser === undefined) return false;
    return !!this.tournament?.players.find((player) => player.playerId === this.appUser?.osuId);
  }

  getRegisterButtonDisabledStatus() {
    if (this.isRegistrationClosed()) return true;
    if (!this.isLoggedIn()) return true;
    if (!this.isAllowedToRegister()) return true;
    return false;
  }

  getRegisterButtonText() {
    if (this.isRegistrationClosed()) return "Registration closed";
    if (!this.isLoggedIn()) return "Login to register";
    if (this.isRegistered()) return "Unregister";
    if (!this.isAllowedToRegister()) return "Not allowed to register with current staff roles";
    return "Register";
  }

  registerDialog() {
    const dialogRef = this.dialogService.open(RegisterDialog,
      {
        data: {
          unregister: this.isRegistered(),
          tournamentName: this.tournament?.name,
        }
      });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.isRegistered() ? this.unregister() : this.register();
    });
  }

  register() {
    this.requestInProgress = true;
    this.tournamentsService.register(this.acronym)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })).subscribe((tournamentPlayer) => {
          this.tournament?.players.push(tournamentPlayer);
          this.requestInProgress = false;
          this.snackBar.open("Successfully registered for the tournament!", "", { duration: 10000 });
        });
  }

  unregister() {
    this.requestInProgress = true;
    this.tournamentsService.unregister(this.acronym)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })).subscribe(() => {
          const index = this.tournament?.players.findIndex((player) => player.playerId === this.appUser?.osuId);
          if (index !== undefined) this.tournament?.players.splice(index, 1);
          this.requestInProgress = false;
          this.snackBar.open("Successfully unregistered from the tournament", "", { duration: 10000 });
        });
  }

  getCurrentTeam() {
    if (this.appUser?.osuId) {
      return this.tournament?.teams.find((team) => team.players.map((player) => player.playerId).includes(this.appUser!.osuId));
    } else return undefined;
  }

  isTeamCaptain() {
    return this.getCurrentTeam()?.players[0].playerId === this.appUser?.osuId;
  }

  get canEditTeam() {
    return this.isTeamCaptain() && (this.tournament?.progress === TournamentProgress.REGISTRATION || this.tournament?.allowTeamEdits);
  }

  onFileSelected(event: any) {
    this.requestInProgress = true;
    const teamId = this.getCurrentTeam()!._id;
    this.tournamentsService.uploadTeamImage(
      this.acronym, teamId, event.target.files[0]
    ).pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
    })).subscribe((updatedTeam) => {
      this.requestInProgress = false;
      this.snackBar.open("Successfully updated team image", "", { duration: 10000 });
      const teamIndex = this.tournament?.teams.findIndex((team) => team._id === teamId);
      if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
    });
  }

  editTeamNameDialog() {
    const dialogRef = this.dialogService.open(EditTeamNameDialog, { data: { initialName: this.getCurrentTeam()?.name } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.updateTeamName(
          this.acronym, this.getCurrentTeam()!._id, result
        ).pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })).subscribe((updatedTeam) => {
          this.requestInProgress = false;
          this.snackBar.open("Successfully updated team name", "", { duration: 10000 });
          const teamIndex = this.tournament?.teams.findIndex((team) => team._id === updatedTeam._id);
          if (teamIndex !== undefined) this.tournament?.teams.splice(teamIndex, 1, updatedTeam);
        });
      }
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
               <h2 mat-dialog-title>Edit Team Name</h2>
               <mat-form-field>
                 <input #teamNameInput matInput type="text" [value]="data.initialName ?? ''">
               </mat-form-field>
               <mat-dialog-actions align="end">
                 <button mat-raised-button color="primary" [mat-dialog-close]="teamNameInput.value">Submit</button>
               </mat-dialog-actions>
             </div>`,
})
export class EditTeamNameDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@NgModule({
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        NavBarModule,
        TournamentTeamCardModule,
        TournamentTeamEditorModule,
    ],
  declarations: [ TournamentRegistrationPage, RegisterDialog, EditTeamNameDialog ],
  exports: [ TournamentRegistrationPage ],
  bootstrap: [ TournamentRegistrationPage ]
})
export class TournamentRegistrationPageModule {}