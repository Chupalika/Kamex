import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Score, ScoreMod } from '../models/models';
import { convertDatetimeLocalToDate, convertDateToDatetimeLocal } from '../tournament/utils'; // todo: refactor this import

const EMPTY_SCORE = { _id: "", playerId: 0, beatmapId: 0, score: 0, accuracy: 0, maxCombo: 0, mods: [], timestamp: new Date(), countPerfect: 0, countGreat: 0, countGood: 0, countOk: 0, countMeh: 0, countMiss: 0, countLargeTickHit: 0, countSmallTickHit: 0, matchId: 0, isImported: true };
const VALID_MODS = ["HD", "HR", "EZ", "FL", "NF", "SD", "PF", "DT", "NC"];

@Component({
  selector: 'score-details',
  templateUrl: './score_details.html',
  styleUrls: ['./score_details.scss']
})
export class ScoreDetails implements OnInit {
  @Input() score: Score = EMPTY_SCORE;
  @Input() editMode: boolean = false;
  @Input() requestInProgress: boolean = false;
  @Output() edit: EventEmitter<any> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();

  editScoreForm: FormGroup;
  scoreFormControl: FormControl;
  accuracyFormControl: FormControl;
  greatCountFormControl: FormControl;
  okCountFormControl: FormControl;
  missCountFormControl: FormControl;
  maxComboFormControl: FormControl;
  modsFormControl: FormControl;
  timestampFormControl: FormControl;
  matchIdFormControl: FormControl;

  constructor() {
    this.scoreFormControl = new FormControl(0, [Validators.required, Validators.pattern(/^-?\d+$/)]);
    this.accuracyFormControl = new FormControl(undefined, [Validators.pattern(/^-?\d+(\.\d+)?$/)]);
    this.greatCountFormControl = new FormControl(undefined, [Validators.pattern(/^-?\d+$/)]);
    this.okCountFormControl = new FormControl(undefined, [Validators.pattern(/^-?\d+$/)]);
    this.missCountFormControl = new FormControl(undefined, [Validators.pattern(/^-?\d+$/)]);
    this.maxComboFormControl = new FormControl(undefined, [Validators.pattern(/^-?\d+$/)]);
    this.modsFormControl = new FormControl(undefined, [this.ModsValidator()]);
    this.timestampFormControl = new FormControl();
    this.matchIdFormControl = new FormControl(undefined, [Validators.pattern(/^\d+$/), Validators.min(0)]);
    this.editScoreForm = new FormGroup({
      score: this.scoreFormControl,
      accuracy: this.accuracyFormControl,
      countGreat: this.greatCountFormControl,
      countOk: this.okCountFormControl,
      countMiss: this.missCountFormControl,
      maxCombo: this.maxComboFormControl,
      mods: this.modsFormControl,
      timestamp: this.timestampFormControl,
      matchId: this.matchIdFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  get scoreScore() {
    return this.score ? this.score.score : EMPTY_SCORE.score;
  }

  get scoreAccuracy() {
    return this.score ? this.score.accuracy : EMPTY_SCORE.accuracy;
  }

  get scoreGreatCount() {
    return this.score ? this.score.countGreat : EMPTY_SCORE.countGreat;
  }

  get scoreOkCount() {
    return this.score ? this.score.countOk : EMPTY_SCORE.countOk;
  }

  get scoreMissCount() {
    return this.score ? this.score.countMiss : EMPTY_SCORE.countMiss;
  }

  get scoreMaxCombo() {
    return this.score ? this.score.maxCombo : EMPTY_SCORE.maxCombo;
  }

  get scoreMods() {
    return this.score ? this.score.mods : EMPTY_SCORE.mods;
  }

  get scoreTimestamp() {
    return this.score ? this.score.timestamp : EMPTY_SCORE.timestamp;
  }

  get scoreMatchId() {
    return this.score ? this.score.matchId : EMPTY_SCORE.matchId;
  }

  refreshForm() {
    this.scoreFormControl.setValue(this.scoreScore);
    this.accuracyFormControl.setValue((this.scoreAccuracy) * 100);
    this.greatCountFormControl.setValue(this.scoreGreatCount);
    this.okCountFormControl.setValue(this.scoreOkCount);
    this.missCountFormControl.setValue(this.scoreMissCount);
    this.maxComboFormControl.setValue(this.scoreMaxCombo);
    this.modsFormControl.setValue(this.getModsString(this.scoreMods));
    this.timestampFormControl.setValue(convertDateToDatetimeLocal(this.scoreTimestamp));
    this.matchIdFormControl.setValue(this.scoreMatchId);
  }

  updateScore() {
    const formValues = this.editScoreForm.getRawValue();
    const updatedScore: Score = {
      ...formValues,
      score: Number(this.scoreFormControl.value),
      accuracy: Number(formValues.accuracy) / 100,
      countGreat: Number(this.greatCountFormControl.value),
      countOk: Number(this.okCountFormControl.value),
      countMiss: Number(this.missCountFormControl.value),
      maxCombo: Number(this.maxComboFormControl.value),
      timestamp: convertDatetimeLocalToDate(formValues.timestamp),
      mods: this.convertToMods(formValues.mods),
      matchId: Number(formValues.matchId),
    };
    this.edit.emit(updatedScore);
  }

  hasChanges(): boolean {
    return this.scoreScore !== Number(this.scoreFormControl.value) ||
           this.scoreAccuracy !== Number(this.accuracyFormControl.value) / 100 ||
           this.scoreGreatCount !== Number(this.greatCountFormControl.value) ||
           this.scoreOkCount !== Number(this.okCountFormControl.value) ||
           this.scoreMissCount !== Number(this.missCountFormControl.value) ||
           this.scoreMaxCombo !== Number(this.maxComboFormControl.value) ||
           this.getModsString(this.scoreMods) !== this.modsFormControl.value ||
           convertDateToDatetimeLocal(this.scoreTimestamp) !== this.timestampFormControl.value ||
           this.scoreMatchId !== Number(this.matchIdFormControl.value);
  }

  getModsString(mods: ScoreMod[]): string {
    return mods.map((mod: ScoreMod) => mod.acronym).join("");
  }

  ModsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors|null => {
      const modsString = control.value ?? "";
      const mods = new Set<string>();
      if (modsString.length % 2 !== 0) return { invalid: true };
        for (let i = 0; i < modsString.length; i += 2) {
          const mod = modsString.substring(i, i+2).toUpperCase();
          if (!VALID_MODS.includes(mod)) return { invalid: true };
          if (mods.has(mod)) return { invalid: true };
          mods.add(mod);
        }
      return null;
    };
  }

  convertToMods(modsString: string): ScoreMod[] {
    const ans: ScoreMod[] = [];
    for (let i = 0; i < modsString.length; i += 2) {
      const mod = modsString.substring(i, i+2).toUpperCase();
      ans.push({ acronym: mod });
    }
    return ans;
  }

  cancelEdit() {
    this.cancel.emit(true);
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
  ],
  declarations: [ ScoreDetails ],
  exports:      [ ScoreDetails ],
  bootstrap:    [ ScoreDetails ]
})
export class ScoreDetailsModule {}