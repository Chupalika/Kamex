import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, Inject, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MappoolSlot } from '../../models/models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { convertFromLazerMods, convertToLazerMods } from '../utils';

@Component({
  selector: 'tournament-slot-editor',
  templateUrl: './tournament_slot_editor.html',
  styleUrls: ['./tournament_slot_editor.scss']
})
export class TournamentSlotEditor implements OnInit, OnChanges {
  @Input() slot?: MappoolSlot;
  @Input() requestInProgress: boolean = false;
  @Input() isMultiMode: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();

  modChoices: string[] = ['HD', 'HR', 'DT', 'FL', 'EZ', 'HT', 'SD', 'PF'];

  editSlotForm: FormGroup;
  labelFormControl: FormControl;
  beatmapIdFormControl: FormControl;
  categoryFormControl: FormControl;
  requiredModsFormControl: FormControl;
  gameModeFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.labelFormControl = new FormControl("", [Validators.required]);
    this.beatmapIdFormControl = new FormControl("", [Validators.required, Validators.min(1)]);
    this.categoryFormControl = new FormControl("");
    this.requiredModsFormControl = new FormControl([]);
    this.gameModeFormControl = new FormControl(undefined);
    this.editSlotForm = new FormGroup({
      label: this.labelFormControl,
      beatmapId: this.beatmapIdFormControl,
      category: this.categoryFormControl,
      requiredMods: this.requiredModsFormControl,
      gameMode: this.gameModeFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["slot"] && changes["slot"].previousValue !== changes["slot"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.labelFormControl.setValue(this.slot?.label ?? "");
    this.beatmapIdFormControl.setValue(this.slot?.beatmap.beatmapId ?? undefined);
    this.categoryFormControl.setValue(this.slot?.category ?? "");
    this.requiredModsFormControl.setValue(convertFromLazerMods(this.slot?.requiredMods) ?? []);
    this.gameModeFormControl.setValue(this.slot?.gameMode ?? undefined);
    if (this.disabled) this.editSlotForm.disable();
  }

  updateSlot() {
    const updatedSlot = this.editSlotForm.getRawValue();
    updatedSlot.requiredMods = convertToLazerMods(updatedSlot.requiredMods);
    this.submit.emit(updatedSlot);
  }

  removeSlot() {
    const dialogRef = this.dialogService.open(RemoveSlotDialog, { data: { slot: this.slot } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.slot);
      }
    });
  }

  hasChanges(): boolean {
    return !this.slot ||
      this.slot.label !== this.labelFormControl.value ||
      this.slot.beatmap.beatmapId !== this.beatmapIdFormControl.value ||
      this.slot.category !== this.categoryFormControl.value ||
      JSON.stringify(convertFromLazerMods(this.slot.requiredMods)) !== JSON.stringify(this.requiredModsFormControl.value) ||
      this.slot.gameMode !== this.gameModeFormControl.value;
  }
}

@Component({
  selector: 'remove-slot-dialog',
  template: `<h2 mat-dialog-title>Remove slot</h2>
             <mat-dialog-content class="mat-typography">
               Remove {{ data.slot?.label }} from the mappool? This will also remove it from stats.
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveSlotDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [ TournamentSlotEditor, RemoveSlotDialog ],
  exports:      [ TournamentSlotEditor ],
  bootstrap:    [ TournamentSlotEditor ]
})
export class TournamentSlotEditorModule {}