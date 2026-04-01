import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TournamentMatch, TournamentMatchEvent } from '../models/models';

@Component({
  selector: 'match-progression',
  templateUrl: './match_progression.html',
  styleUrls: ['./match_progression.scss']
})
export class MatchProgression implements OnInit {
  @Input() match?: TournamentMatch;
  @Input() matchProgression: TournamentMatchEvent[] = [];
  @Input() editMode: boolean = false;
  @Input() requestInProgress: boolean = false;
  @Output() edit: EventEmitter<any> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();

  participantColors: Map<string, string> = new Map();

  editProgressionForm: FormGroup;
  matchEventsFormControl: FormArray;

  constructor() {
    this.matchEventsFormControl = new FormArray<FormControl>([]);
    this.editProgressionForm = new FormGroup({
      matchEvents: this.matchEventsFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
    const colors = ["red", "blue", "green", "orange", "purple", "yellow", "magenta", "cyan"];
    for (let i = 0; i < (this.match?.participants || []).length; i++) {
      const participantId = this.match!.participants[i].playerOrTeam._id;
      this.participantColors.set(participantId, colors[i % colors.length]);
    }
  }

  refreshForm() {
    // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA");
    // console.log(this.match);
    // console.log(this.matchProgression);
    this.getMatchEventsFormArray().clear();
    for (let matchEvent of (this.matchProgression || [])) {
      this.addMatchEvent(matchEvent.playerOrTeam, matchEvent.action, matchEvent.value, matchEvent.results, matchEvent.scoreline);
    }
  }

  updateProgression() {
    console.log(this.editProgressionForm.value);
    this.edit.emit([]);
  }

  hasChanges(): boolean {
    return true;
  }

  cancelEdit() {
    this.cancel.emit(true);
  }

  getParticipantName(id: string): string {
    const participant = this.match?.participants.find(p => p.playerOrTeam._id === id);
    let participantName = participant ? ("name" in participant.playerOrTeam ? participant.playerOrTeam.name : participant.playerOrTeam.username) : "<Unknown>";
    if (participantName.length > 40) participantName = participantName.slice(0, 37) + "...";
    return participantName;
  }

  getParticipantColor(id: string): string {
    return this.participantColors.get(id) || "";
  }

  getPastTense(action: string): string {
    switch (action) {
      case "win":
        return "won";
      case "lose":
        return "lost";
      default:
        return action + "ed";
    }
  }

  getMatchEventsFormArray(): FormArray {
    return this.editProgressionForm.controls["matchEvents"] as FormArray;
  }

  getMatchEventsFormGroups(): FormGroup[] {
    return this.getMatchEventsFormArray().controls as FormGroup[];
  }

  addMatchEvent(participant = "", action = "", value = "", results: { playerOrTeam: string, score: number }[] = [], scoreline: { playerOrTeam: string, score: number }[] = []) {
    const matchEventParticipantFormControl = new FormControl(participant, []);
    const matchEventActionFormControl = new FormControl(action, [Validators.required]);
    const matchEventValueFormControl = new FormControl(value, [Validators.required]);
    const matchResultsFormControl = new FormArray<FormControl>([]);
    const matchScorelineFormControl = new FormArray<FormControl>([]);
    const matchEventForm = new FormGroup({
      participant: matchEventParticipantFormControl,
      action: matchEventActionFormControl,
      value: matchEventValueFormControl,
      results: matchResultsFormControl,
      scoreline: matchScorelineFormControl,
    });
    this.getMatchEventsFormArray().push(matchEventForm);

    for (let result of results) {
      this.addMatchEventResult(matchEventForm, result.playerOrTeam, result.score);
    }
    for (let scorelineEntry of scoreline) {
      this.addMatchEventScoreline(matchEventForm, scorelineEntry.playerOrTeam, scorelineEntry.score);
    }
  }

  deleteMatchEvent(index: number) {
    this.getMatchEventsFormArray().removeAt(index);
  }

  getColor(index: number) {
    return this.getMatchEventsFormArray().at(index).value.color;
  }

  rearrangeMatchEvents(event: CdkDragDrop<string[]>) {
    const theArray = this.getMatchEventsFormArray();
    const theControl = theArray.at(event.previousIndex);
    theArray.removeAt(event.previousIndex);
    theArray.insert(event.currentIndex, theControl);
  }

  getMatchEventResultsFormArray(form: FormGroup): FormArray {
    return form.controls["results"] as FormArray;
  }

  getMatchEventScorelineFormArray(form: FormGroup): FormArray {
    return form.controls["scoreline"] as FormArray;
  }

  addMatchEventResult(form: FormGroup, playerOrTeam = "", score = 0) {
    const participantFormControl = new FormControl(playerOrTeam, [Validators.required]);
    const scoreFormControl = new FormControl(score, [Validators.required]);
    const resultFormControl = new FormGroup({
      playerOrTeam: participantFormControl,
      score: scoreFormControl,
    });
    this.getMatchEventResultsFormArray(form).push(resultFormControl);
  }

  addMatchEventScoreline(form: FormGroup, playerOrTeam = "", score = 0) {
    const participantFormControl = new FormControl(playerOrTeam, [Validators.required]);
    const scoreFormControl = new FormControl(score, [Validators.required]);
    const scorelineFormControl = new FormGroup({
      playerOrTeam: participantFormControl,
      score: scoreFormControl,
    });
    this.getMatchEventScorelineFormArray(form).push(scorelineFormControl);
  }

  deleteMatchEventResult(form: FormGroup, index: number) {
    this.getMatchEventResultsFormArray(form).removeAt(index);
  }

  deleteMatchEventScoreline(form: FormGroup, index: number) {
    this.getMatchEventScorelineFormArray(form).removeAt(index);
  }
}

@NgModule({
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [ MatchProgression ],
  exports:      [ MatchProgression ],
  bootstrap:    [ MatchProgression ]
})
export class MatchProgressionModule {}