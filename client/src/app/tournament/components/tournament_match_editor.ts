import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { TournamentMatch, TournamentMatchConditional, TournamentMatchParticipant, TournamentPlayer, TournamentStaffMember, TournamentTeam } from '../../models/models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { convertDatetimeLocalToDate, convertDateToDatetimeLocal } from '../utils';

@Component({
  selector: 'tournament-match-editor',
  templateUrl: './tournament_match_editor.html',
  styleUrls: ['./tournament_match_editor.scss']
})
export class TournamentMatchEditor implements OnInit, OnChanges {
  @Input() match?: TournamentMatch;
  @Input() enableTeams: boolean = false;
  @Input() players: TournamentPlayer[] = [];
  @Input() teams: TournamentTeam[] = [];
  @Input() matches: TournamentMatch[] = [];
  @Input() staffMembers: TournamentStaffMember[] = [];
  @Input() requestInProgress: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();

  editMatchForm: FormGroup;
  idFormControl: FormControl;
  timeFormControl: FormControl;
  isTeamMatchFormControl: FormControl;
  typeFormControl: FormControl;
  enableSignupsFormControl: FormControl
  maxLobbyParticipantsFormControl: FormControl;
  participantsFormControl: FormArray;
  conditionalsFormControl: FormArray;
  refereesFormControl: FormControl;
  streamersFormControl: FormControl;
  commentatorsFormControl: FormControl;
  matchIdsFormControl: FormControl;
  vodLinksFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.idFormControl = new FormControl("", [Validators.required]);
    this.timeFormControl = new FormControl("", [Validators.required]);
    this.isTeamMatchFormControl = new FormControl(false);
    this.typeFormControl = new FormControl("versus", [Validators.required]);
    this.enableSignupsFormControl = new FormControl(false);
    this.maxLobbyParticipantsFormControl = new FormControl(8);
    this.participantsFormControl = new FormArray<FormControl>([]);
    this.conditionalsFormControl = new FormArray<FormControl>([]);
    this.refereesFormControl = new FormControl([]);
    this.streamersFormControl = new FormControl([]);
    this.commentatorsFormControl = new FormControl([]);
    this.matchIdsFormControl = new FormControl("");
    this.vodLinksFormControl = new FormControl("");
    this.editMatchForm = new FormGroup({
      id: this.idFormControl,
      time: this.timeFormControl,
      isTeamMatch: this.isTeamMatchFormControl,
      type: this.typeFormControl,
      enableSignups: this.enableSignupsFormControl,
      maxLobbyParticipants: this.maxLobbyParticipantsFormControl,
      participants: this.participantsFormControl,
      conditionals: this.conditionalsFormControl,
      referees: this.refereesFormControl,
      streamers: this.streamersFormControl,
      commentators: this.commentatorsFormControl,
      matchIds: this.matchIdsFormControl,
      vodLinks: this.vodLinksFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["match"] && changes["match"].previousValue !== changes["match"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    if (this.match) {
      this.idFormControl.setValue(this.match.id);
      this.timeFormControl.setValue(convertDateToDatetimeLocal(this.match.time));
      this.isTeamMatchFormControl.setValue(this.match.isTeamMatch);
      this.typeFormControl.setValue(this.match.type);
      this.enableSignupsFormControl.setValue(this.match.enableSignups);
      this.maxLobbyParticipantsFormControl.setValue(this.match.maxLobbyParticipants);
      //this.playersFormControl.setValue(this.match.players!.map(player => player._id));
      //this.teamsFormControl.setValue(this.match.teams!.map(team => team._id));
      this.getParticipantsFormArray().clear();
      for (let participant of (this.match.participants || [])) {
        this.addParticipant(participant);
      }
      this.getConditionalsFormArray().clear();
      for (let conditional of (this.match.conditionals || [])) {
        this.addConditional(conditional);
      }
      this.refereesFormControl.setValue(this.match.referees.map(referee => referee._id));
      this.streamersFormControl.setValue(this.match.streamers.map(streamer => streamer._id));
      this.commentatorsFormControl.setValue(this.match.commentators.map(commentator => commentator._id));
      this.matchIdsFormControl.setValue(this.match.matchIds.join(","));
      this.vodLinksFormControl.setValue(this.match.vodLinks.join(","));
    }
    else {
      this.idFormControl.setValue("");
      this.timeFormControl.setValue(undefined);
      this.isTeamMatchFormControl.setValue(this.enableTeams);
      this.typeFormControl.setValue("versus");
      this.enableSignupsFormControl.setValue(false);
      this.maxLobbyParticipantsFormControl.setValue(8);
      this.getParticipantsFormArray().clear();
      this.getConditionalsFormArray().clear();
      this.refereesFormControl.setValue([]);
      this.streamersFormControl.setValue([]);
      this.commentatorsFormControl.setValue([]);
      this.matchIdsFormControl.setValue("");
      this.vodLinksFormControl.setValue("");
    }
    if (this.disabled) this.editMatchForm.disable();
    this.availabilityScores = undefined;
  }

  updateMatch() {
    const formValues = this.editMatchForm.getRawValue();
    const updatedMatch = {
      id: formValues.id,
      time: convertDatetimeLocalToDate(formValues.time),
      isTeamMatch: formValues.isTeamMatch,
      type: formValues.type,
      enableSignups: formValues.enableSignups,
      maxLobbyParticipants: formValues.maxLobbyParticipants,
      participants: formValues.participants,
      conditionals: formValues.conditionals,
      referees: (formValues.referees as string[]).map((_id) => ({ _id })),
      streamers: (formValues.streamers as string[]).map((_id) => ({ _id })),
      commentators: (formValues.commentators as string[]).map((_id) => ({ _id })),
      matchIds: formValues.matchIds.length > 0 ? formValues.matchIds.split(",") : [],
      vodLinks: formValues.vodLinks.length > 0 ? formValues.vodLinks.split(",") : [],
      matchProgression: this.match?.matchProgression || [], // this property is edited elsewhere
    };
    this.submit.emit(updatedMatch);
  }

  removeMatch() {
      const dialogRef = this.dialogService.open(RemoveMatchDialog);
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.remove.emit(this.match);
        }
      });
    }

  hasChanges(): boolean {
    return !this.match ||
      this.match.id !== this.idFormControl.value ||
      convertDateToDatetimeLocal(this.match.time) !== this.timeFormControl.value ||
      this.match.isTeamMatch !== this.isTeamMatchFormControl.value ||
      this.match.type !== this.typeFormControl.value ||
      this.match.enableSignups !== this.enableSignupsFormControl.value ||
      this.match.maxLobbyParticipants !== this.maxLobbyParticipantsFormControl.value ||
      JSON.stringify(this.match.participants?.map(participant => this.simplifyParticipant(participant))) !== JSON.stringify(this.participantsFormControl.value) ||
      JSON.stringify(this.match.conditionals?.map(conditional => this.simplifyConditional(conditional))) !== JSON.stringify(this.conditionalsFormControl.value) ||
      JSON.stringify(this.match.referees.map(referee => referee._id)) !== JSON.stringify(this.refereesFormControl.value) ||
      JSON.stringify(this.match.streamers.map(streamer => streamer._id)) !== JSON.stringify(this.streamersFormControl.value) ||
      JSON.stringify(this.match.commentators.map(commentator => commentator._id)) !== JSON.stringify(this.commentatorsFormControl.value) ||
      this.match.matchIds.join(",") !== this.matchIdsFormControl.value ||
      this.match.vodLinks.join(",") !== this.vodLinksFormControl.value;
  }

  isTeamMatch(): boolean {
    return this.isTeamMatchFormControl.value;
  }

  isLobbyType(): boolean {
    return this.typeFormControl.value === "lobby";
  }

  simplifyParticipant(participant: TournamentMatchParticipant) {
    return {
      playerOrTeam: participant.playerOrTeam._id,
      score: participant.score,
    };
  }

  simplifyConditional(conditional: TournamentMatchConditional) {
    return {
      matchId: conditional.matchId,
      playerOrTeam: conditional.playerOrTeam._id,
      win: conditional.win,
    };
  }

  getParticipantsFormArray(): FormArray {
    return this.editMatchForm.controls["participants"] as FormArray;
  }

  getParticipantsFormGroups(): FormGroup[] {
    return this.getParticipantsFormArray().controls as FormGroup[];
  }

  addParticipant(participant: TournamentMatchParticipant|undefined = undefined) {
    const participantPlayerOrTeamFormControl = new FormControl(participant?.playerOrTeam._id || "", [Validators.required]);
    const participantScoreFormControl = new FormControl(participant?.score || 0, [Validators.required]);
    const participantForm = new FormGroup({
      playerOrTeam: participantPlayerOrTeamFormControl,
      score: participantScoreFormControl,
    });
    this.getParticipantsFormArray().push(participantForm);
  }

  deleteParticipant(index: number) {
    this.getParticipantsFormArray().removeAt(index);
  }

  getConditionalsFormArray(): FormArray {
    return this.editMatchForm.controls["conditionals"] as FormArray;
  }

  getConditionalsFormGroups(): FormGroup[] {
    return this.getConditionalsFormArray().controls as FormGroup[];
  }

  addConditional(conditional: TournamentMatchConditional|undefined = undefined) {
    const conditionalMatchIdFormControl = new FormControl(conditional?.matchId || "", [Validators.required]);
    const conditionalPlayerOrTeamFormControl = new FormControl(conditional?.playerOrTeam._id || "", [Validators.required]);
    const conditionalWinFormControl = new FormControl(conditional?.win || true);
    const conditionalForm = new FormGroup({
      matchId: conditionalMatchIdFormControl,
      playerOrTeam: conditionalPlayerOrTeamFormControl,
      win: conditionalWinFormControl,
    });
    this.getConditionalsFormArray().push(conditionalForm);
  }

  deleteConditional(index: number) {
    this.getConditionalsFormArray().removeAt(index);
  }

  getSortedPlayers() {
    const dup = this.players.map(x => x);
    dup.sort((a,b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    return dup;
  }

  getSortedTeams() {
    const dup = this.teams.map(x => x);
    dup.sort((a,b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    return dup;
  }

  getSortedStaffMembers() {
    const dup = this.staffMembers.map(x => x);
    dup.sort((a,b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    return dup;
  }

  getSortedMatches() {
    return [...this.matches].sort((a, b) => {
      if (!Number.isNaN(parseInt(a.id)) && !Number.isNaN(parseInt(b.id))) {
        return parseInt(a.id) < parseInt(b.id) ? -1 : 1;
      } else {
        return a.id < b.id ? -1 : 1;
      }
    });
  }

  getTeamsFromMatch(matchId: string) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return [];
    return this.getSortedTeams().filter(team => match.participants.map(participant => participant.playerOrTeam._id).includes(team._id));
  }

  getPlayersFromMatch(matchId: string) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return [];
    return this.getSortedPlayers().filter(player => match.participants.map(participant => participant.playerOrTeam._id).includes(player._id));
  }

  rearrangeParticipants(event: CdkDragDrop<string[]>) {
    const theArray = this.getParticipantsFormArray();
    const theControl = theArray.at(event.previousIndex);
    theArray.removeAt(event.previousIndex);
    theArray.insert(event.currentIndex, theControl);
  }

  // Scheduler
  //              0   1   2   3   4   5   6   7   8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
  TIME_SCORES = [-1, -2, -3, -3, -3, -3, -3, -2, -1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1];
  availabilityScores?: number[];
  generateAvailabilityScores() {
    const timezones = [];
    if (this.isTeamMatch()) {
      for (let participantForm of this.getParticipantsFormArray().controls) {
        const teamId = participantForm.get("playerOrTeam")?.value;
        const team = this.teams.find(t => t._id === teamId);
        if (team) {
          const teamPlayerTimezones = team.players.map(player => player.appUser?.timezone || 0);
          timezones.push(...teamPlayerTimezones);
        }
      }
    }
    else {
      for (let participantForm of this.getParticipantsFormArray().controls) {
        const playerId = participantForm.get("playerOrTeam")?.value;
        const player = this.players.find(p => p._id === playerId);
        if (player) {
          timezones.push(player.appUser?.timezone || 0);
        }
      }
    }

    const scores = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let timezone of timezones) {
      for (let i = 0; i < 24; i++) {
        const convertedTime = (i + timezone + 24) % 24;
        const score = this.TIME_SCORES[convertedTime];
        scores[i] += score;
      }
    }
    this.availabilityScores = scores;
  }
}

@Component({
  selector: 'remove-match-dialog',
  template: `<h2 mat-dialog-title>Remove match</h2>
             <mat-dialog-content class="mat-typography">
               Delete this match?
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveMatchDialog {}

@NgModule({
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  declarations: [ TournamentMatchEditor, RemoveMatchDialog ],
  exports:      [ TournamentMatchEditor ],
  bootstrap:    [ TournamentMatchEditor ]
})
export class TournamentMatchEditorModule {}