import { Component, NgModule } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
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
  templateUrl: './admin_page.html',
  styleUrls: ['./admin_page.scss']
})
export class AdminPage {
  tournaments: Tournament[];
  newTournamentForm: FormGroup;
  requestInProgress = false;
  statusMessage = "";

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
  }

  refreshTournamentList() {
    this.tournamentsService.getTournaments().subscribe((tournaments) => {
      this.tournaments = tournaments;
    });
  }

  submitNewTournamentForm(partialTournament: Partial<Tournament>) {
    if (!partialTournament.acronym) return;
    this.requestInProgress = true;
    this.tournamentsService.createTournament(partialTournament)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((newTournament) => {
          this.refreshTournamentList();
          this.requestInProgress = false;
          this.snackBar.open("Successfully edited settings.", "", { duration: 10000 });
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
