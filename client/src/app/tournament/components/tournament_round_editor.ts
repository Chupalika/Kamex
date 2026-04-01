import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, Inject, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TournamentRound } from '../../models/models';
import { convertDatetimeLocalToDate, convertDateToDatetimeLocal } from '../utils';

@Component({
  selector: 'tournament-round-editor',
  templateUrl: './tournament_round_editor.html',
  styleUrls: ['./tournament_round_editor.scss']
})
export class TournamentRoundEditor implements OnInit, OnChanges {
  @Input() round?: TournamentRound;
  @Input() requestInProgress: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();

  tournamentRoundForm: FormGroup;
  nameFormControl: FormControl;
  startDateFormControl: FormControl;
  mappoolWipFormControl: FormControl;
  scoresheetWipFormControl: FormControl;
  mappoolDownloadUrlFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.nameFormControl = new FormControl("", [Validators.required]);
    this.startDateFormControl = new FormControl(undefined, [Validators.required]);
    this.mappoolWipFormControl = new FormControl(true);
    this.scoresheetWipFormControl = new FormControl(true);
    this.mappoolDownloadUrlFormControl = new FormControl("");
    this.tournamentRoundForm = new FormGroup({
      name: this.nameFormControl,
      startDate: this.startDateFormControl,
      mappoolWip: this.mappoolWipFormControl,
      scoresheetWip: this.scoresheetWipFormControl,
      mappoolDownloadUrl: this.mappoolDownloadUrlFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["round"] && changes["round"].previousValue !== changes["round"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.nameFormControl.setValue(this.round?.name ?? "");
    this.startDateFormControl.setValue(this.round ? convertDateToDatetimeLocal(this.round.startDate) : undefined);
    this.mappoolWipFormControl.setValue(this.round?.mappoolWip ?? true);
    this.scoresheetWipFormControl.setValue(this.round?.scoresheetWip ?? true);
    this.mappoolDownloadUrlFormControl.setValue(this.round?.mappool?.downloadUrl ?? "");
    if (this.disabled) this.tournamentRoundForm.disable();
  }

  updateTournamentRound() {
    const updatedTournamentRound = this.tournamentRoundForm?.getRawValue();
    updatedTournamentRound.startDate = convertDatetimeLocalToDate(updatedTournamentRound.startDate);
    this.submit.emit(updatedTournamentRound);
  }

  removeTournamentRound() {
    const dialogRef = this.dialogService.open(RemoveRoundDialog, { data: { round: this.round } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.round);
      }
    });
  }

  hasChanges(): boolean {
    return !this.round ||
      this.round.name !== this.nameFormControl.value ||
      convertDateToDatetimeLocal(this.round.startDate) !== this.startDateFormControl.value ||
      this.round.mappoolWip !== this.mappoolWipFormControl.value ||
      this.round.scoresheetWip !== this.scoresheetWipFormControl.value ||
      this.round.mappool.downloadUrl !== this.mappoolDownloadUrlFormControl.value;
  }
}

@Component({
  selector: 'remove-round-dialog',
  template: `<h2 mat-dialog-title>Remove round</h2>
             <mat-dialog-content class="mat-typography">
               Delete the {{ data.round?.name }} round? This will also remove the mappools, matches, and stats.
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveRoundDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@NgModule({
  imports: [
    CommonModule,
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
  declarations: [ TournamentRoundEditor, RemoveRoundDialog ],
  exports:      [ TournamentRoundEditor ],
  bootstrap:    [ TournamentRoundEditor ]
})
export class TournamentRoundEditorModule {}
