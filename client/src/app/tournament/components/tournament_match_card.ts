import { Component, NgModule, Input, EventEmitter, Output, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider'; 
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HovercardModule } from 'src/app/components/hovercard';
import { TournamentPlayerCard } from '../components/tournament_player_card';
import { TournamentTeamCard } from '../components/tournament_team_card';
import { TournamentStaffMemberCard } from '../components/tournament_staff_member_card';

import { SubmitMatchDto, TournamentMatch, TournamentMatchEvent, TournamentMatchParticipant, TournamentPlayer, TournamentStaffMember, TournamentTeam } from '../../models/models';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { MatchProgressionModule } from 'src/app/components/match_progression';
import { TournamentSubmitMatchEditorModule } from './tournament_submit_match_editor';
import { catchError } from 'rxjs/internal/operators/catchError';
import { throwError } from 'rxjs/internal/observable/throwError';

@Component({
  selector: 'tournament-match-card',
  templateUrl: './tournament_match_card.html',
  styleUrls: ['./tournament_match_card.scss']
})
export class TournamentMatchCard {
  @Input() match?: TournamentMatch;
  @Input() timezone: number = 0;
  @Input() gameMode: string = "";
  @Input() tourneyAcronym: string = "";
  @Input() tourneyRoundId: string = "";
  @Input() isHeader: boolean = false;
  @Input() isLobby: boolean = false;
  @Input() participantType: "Player"|"Team"|"Participant" = "Participant";
  @Input() mobileMode: boolean = false;
  // todo: improve this to hide from api response as well
  @Input() hideLinks: boolean = false;
  @Input() playerFlagsToggle: boolean = false;
  @Input() signupStatus: ""|"can_register"|"can_unregister" = "";
  @Input() refereeStatus: ""|"can_register"|"can_unregister" = "";
  @Input() streamerStatus: ""|"can_register"|"can_unregister" = "";
  @Input() commentatorStatus: ""|"can_register"|"can_unregister" = "";
  @Input() requestInProgress: boolean = false;
  @Output() toggleSignup: EventEmitter<any> = new EventEmitter();
  @Output() toggleReferee: EventEmitter<any> = new EventEmitter();
  @Output() toggleStreamer: EventEmitter<any> = new EventEmitter();
  @Output() toggleCommentator: EventEmitter<any> = new EventEmitter();

  TournamentPlayerCard = TournamentPlayerCard;
  TournamentTeamCard = TournamentTeamCard;
  TournamentStaffMemberCard = TournamentStaffMemberCard;

  readonly dialogService = inject(MatDialog);

  constructor() {}

  get timezoneLabel() {
    return `UTC${this.timezone >= 0 ? "+" : ""}${this.timezone}`;
  }

  isPlayer(playerOrTeam: TournamentPlayer|TournamentTeam): playerOrTeam is TournamentPlayer {
    return 'username' in playerOrTeam;
  }

  getParticipantName(participant: TournamentMatchParticipant) {
    if (this.isPlayer(participant.playerOrTeam)) {
      return participant.playerOrTeam.username;
    } else {
      return participant.playerOrTeam.name;
    }
  }

  getParticipantImage(participant: TournamentMatchParticipant) {
    if (this.isPlayer(participant.playerOrTeam)) {
      if (this.playerFlagsToggle) {
        return 'https://flagcdn.com/w40/' + participant.playerOrTeam.country.toLowerCase() + '.png';
      } else {
        return `https://a.ppy.sh/${participant.playerOrTeam.playerId}`;
      }
    } else {
      return participant.playerOrTeam.imageLink;
    }
  }

  getStaffMemberImage(staffMember: TournamentStaffMember) {
    if (this.playerFlagsToggle) {
      return 'https://flagcdn.com/w40/' + staffMember.country?.toLowerCase() + '.png';
    } else {
      return `https://a.ppy.sh/${staffMember.playerId}`;
    }
  }

  getFormattedMatchTime(time: Date) {
    const adjustedTime = new Date(time.getTime() + this.timezone * 60 * 60 * 1000);
    const month = String(adjustedTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(adjustedTime.getUTCDate()).padStart(2, "0");
    const hour = String(adjustedTime.getUTCHours()).padStart(2, "0");
    const minute = String(adjustedTime.getUTCMinutes()).padStart(2, "0");
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][adjustedTime.getUTCDay()];
    const month2 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][adjustedTime.getUTCMonth()];
    if (adjustedTime.getUTCFullYear() === new Date().getUTCFullYear()) {
      return `${weekday} ${month2} ${day} ${hour}:${minute}`;
    } else {
      return `${adjustedTime.getUTCFullYear()}-${month}-${day} ${hour}:${minute}`;
    }
  }

  getMatchHighestScore() {
    if (!this.match) return 0;
    return Math.max(...this.match.participants.map(p => p.score || 0));
  }

  toggleSignupHelper() {
    this.toggleSignup.emit();
  }
  
  toggleRefereeHelper() {
    this.toggleReferee.emit();
  }

  toggleStreamerHelper() {
    this.toggleStreamer.emit();
  }

  toggleCommentatorHelper() {
    this.toggleCommentator.emit();
  }

  openMatchProgression() {
    const dialogRef = this.dialogService.open(
      MatchProgressionDialog, { data: { match: this.match, matchProgression: this.match?.matchProgression, canEdit: /*this.refereeStatus !== ""*/ false, acronym: "" } }
    );
  }

  openSubmitMatchEditor() {
    const dialogRef = this.dialogService.open(
      SubmitMatchEditorDialog, { data: { match: this.match, acronym: this.tourneyAcronym, roundId: this.tourneyRoundId } }
    );
    dialogRef.afterClosed().subscribe((updatedMatch: TournamentMatch) => {
      if (updatedMatch) {
        this.match = updatedMatch;
      }
    });
  }
}

@Component({
  selector: 'match-progression-dialog',
  template: `<h2 mat-dialog-title>Match Progression for match {{ data.match.id }}</h2>
             <mat-dialog-content class="mat-typography">
               <match-progression
                 [match]="data.match"
                 [matchProgression]="data.matchProgression"
                 [editMode]="editMode"
                 [requestInProgress]="requestInProgress"
                 (edit)="submitEdit($event)"
                 (cancel)="toggleEdit()"
               >
               </match-progression>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;" *ngIf="!editMode">
               <button *ngIf="data.canEdit" mat-raised-button color="primary" (click)="toggleEdit()" [disabled]="requestInProgress">Edit</button>
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">Close</button>
             </mat-dialog-actions>`,
})
export class MatchProgressionDialog {
  editMode: boolean = false;
  requestInProgress: boolean = false;
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { match: TournamentMatch, matchProgression: TournamentMatchEvent[], canEdit: boolean, acronym: string },
    private dialogRef: MatDialogRef<MatchProgressionDialog>,
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
  ) {}

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  async submitEdit(updatedProgression: TournamentMatchEvent[]) {
    console.log(updatedProgression);
    this.toggleEdit();
  }
}

@Component({
  selector: 'submit-match-editor-dialog',
  template: `<h2 mat-dialog-title>Submit results for match {{ data.match.id }}</h2>
             <mat-dialog-content class="mat-typography">
               <tournament-submit-match-editor
                 [match]="data.match"
                 [requestInProgress]="requestInProgress"
                 (submit)="submitMatch($event)">
               </tournament-submit-match-editor>
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">Cancel</button>
             </mat-dialog-actions>`,
})
export class SubmitMatchEditorDialog {
  requestInProgress: boolean = false;
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { match: TournamentMatch, acronym: string, roundId: string },
    private dialogRef: MatDialogRef<SubmitMatchEditorDialog>,
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
  ) {}

  async submitMatch(submitMatchDto: SubmitMatchDto) {
    if (!submitMatchDto.id) return;
    this.requestInProgress = true;
    this.tournamentsService.submitMatch(this.data.acronym, this.data.roundId, submitMatchDto)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe((updatedTournamentMatch) => {
        this.requestInProgress = false;
        this.snackBar.open("Successfully submitted match to round.", "", { duration: 10000 });
        this.dialogRef.close(updatedTournamentMatch);
      });
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatchProgressionModule,
    TournamentSubmitMatchEditorModule,
  ],
  declarations: [ TournamentMatchCard, MatchProgressionDialog, SubmitMatchEditorDialog ],
  exports:      [ TournamentMatchCard ],
  bootstrap:    [ TournamentMatchCard ]
})
export class TournamentMatchCardModule {}