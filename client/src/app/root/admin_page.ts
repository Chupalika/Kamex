import { Component, DestroyRef, inject, NgModule } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { TournamentsService } from '../services/tournaments.service';
import { Tournament } from '../models/models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TournamentSettingsEditorModule } from "../tournament/components/tournament_settings_editor";
import {catchError} from "rxjs/operators";
import {throwError} from "rxjs";

@Component({
  selector: 'admin-page',
  template:
   `<div class="mat-headline-5">ADMIN PAGE</div>

    <div class="mat-body">
      Tournaments
      <ul>
        <li *ngFor="let tourney of tournaments">{{ tourney.name }}</li>
      </ul>
    </div>

    <div class="mat-headline-5">Create a tourney</div>
    <tournament-settings-editor
      (submit)="submitNewTournamentForm($event)"
      [requestInProgress]="requestInProgress">
    </tournament-settings-editor>`
})
export class AdminPage {
  tournaments: Tournament[];
  newTournamentForm: FormGroup;
  requestInProgress = false;
  statusMessage = "";

  readonly destroyRef = inject(DestroyRef);

  constructor(private tournamentsService: TournamentsService, private snackBar: MatSnackBar) {
    this.tournaments = [];
    this.newTournamentForm = new FormGroup({
      newTournamentName: new FormControl("", [Validators.required]),
      newTournamentAcronym: new FormControl("", [Validators.required]),
      newTournamentGameMode: new FormControl(0, [Validators.required]),
      newTournamentTeamSize: new FormControl(1, [Validators.required, Validators.min(1)]),
    });
  }

  ngOnInit() {
    this.refreshTournamentList();
    this.tournamentsService.requestInProgress$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((requestInProgress) => { this.requestInProgress = requestInProgress; });
  }

  refreshTournamentList() {
    this.tournamentsService.getTournaments().subscribe((tournaments) => { this.tournaments = tournaments; });
  }

  submitNewTournamentForm(partialTournament: Partial<Tournament>) {
    if (!partialTournament.acronym) return;
    this.tournamentsService.createTournament(partialTournament).subscribe((newTournament) => {
      this.refreshTournamentList();
      this.snackBar.open("Successfully created tournament.", "", { duration: 10000 });
    });
  }
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterModule,
    TournamentSettingsEditorModule,
  ],
  declarations: [ AdminPage ],
  exports:      [ AdminPage ],
  bootstrap:    [ AdminPage ]
})
export class AdminPageModule {}
