import { Component, NgModule, Input, EventEmitter, Output, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

import { HovercardModule } from '../../components/hovercard';
import { Mappool } from 'src/app/models/models';

@Component({
  selector: 'tournament-mappool-editor',
  template:
   `<form [formGroup]="editMappoolForm" (ngSubmit)="updateMappool()" class="tourney-form" autocomplete="off">
      <mat-form-field>
        <mat-label>Mappool Download URL</mat-label>
        <input matInput type="text" formControlName="mappoolDownloadUrl">
      </mat-form-field>
      <button
        mat-raised-button
        type="submit"
        color="primary"
        [disabled]="requestInProgress || !hasChanges()"
      >
        Update
      </button>
    </form>`,
  styles:
   `.label { display: flex; align-items: center; line-height: 30px; }
    .captain { font-weight: bold; }
    .img-container { display: flex; align-self: flex-start; }
    .square-avatar { width: 30px; height: 30px; margin-right: 6px; border-radius: 2px; object-fit: contain; }
    .flag-avatar { width: 30px; height: 20px; margin: 5px 6px 5px 0; border-radius: 2px; object-fit: contain; }
    .flipped { margin-right: unset; margin-left: 6px; }`,
})
export class TournamentMappoolEditor implements OnInit, OnChanges {
  @Input() mappool?: Mappool;
  @Input() requestInProgress: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() copy: EventEmitter<any> = new EventEmitter();

  editMappoolForm: FormGroup;
  mappoolDownloadUrlFormControl: FormControl;

  constructor() {
    this.mappoolDownloadUrlFormControl = new FormControl("");
    this.editMappoolForm = new FormGroup({
      mappoolDownloadUrl: this.mappoolDownloadUrlFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["mappool"] && changes["mappool"].previousValue !== changes["mappool"].currentValue) {
      this.refreshForm();
    }
  }

  hasChanges(): boolean {
    return !this.mappool || this.mappool.downloadUrl !== this.mappoolDownloadUrlFormControl.value;
  }

  refreshForm() {
    this.mappoolDownloadUrlFormControl.setValue(this.mappool?.downloadUrl ?? "");
  }

  updateMappool() {
    const updatedTournamentMappool = this.editMappoolForm?.getRawValue();
    this.submit.emit(updatedTournamentMappool);
  }

  copyTournamentMappool(mappoolId: string) {
    this.copy.emit(mappoolId);
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatFormFieldModule,
    ReactiveFormsModule,
  ],
  declarations: [ TournamentMappoolEditor ],
  exports:      [ TournamentMappoolEditor ],
  bootstrap:    [ TournamentMappoolEditor ]
})
export class TournamentMappoolEditorModule {}