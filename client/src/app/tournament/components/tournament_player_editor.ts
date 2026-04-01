import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TournamentPlayer } from '../../models/models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'tournament-player-editor',
  templateUrl: './tournament_player_editor.html',
  styleUrls: ['./tournament_player_editor.scss']
})
export class TournamentPlayerEditor implements OnInit, OnChanges {
  @Input() player?: TournamentPlayer;
  @Input() requestInProgress: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();
  @Output() uploadImage: EventEmitter<any> = new EventEmitter();

  editPlayerForm: FormGroup;
  playerIdFormControl: FormControl;
  seedFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.playerIdFormControl = new FormControl("", [Validators.required]);
    this.seedFormControl = new FormControl("");
    this.editPlayerForm = new FormGroup({
      playerId: this.playerIdFormControl,
      seed: this.seedFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["player"] && changes["player"].previousValue !== changes["player"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.playerIdFormControl.setValue(this.player?.playerId ?? "");
    this.seedFormControl.setValue(this.player?.seed ?? "");
    if (this.player) this.playerIdFormControl.disable();
    else this.playerIdFormControl.enable();
    if (this.disabled) this.editPlayerForm.disable();
  }

  updatePlayer() {
    const updatedPlayer = this.editPlayerForm.getRawValue();
    this.submit.emit(updatedPlayer);
  }

  removePlayer() {
    const dialogRef = this.dialogService.open(RemovePlayerDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.player);
      }
    });
  }

  hasChanges(): boolean {
    return !this.player ||
      this.player.playerId !== this.playerIdFormControl.value ||
      this.player.seed !== this.seedFormControl.value;
  }
}

@Component({
  selector: 'remove-player-dialog',
  template: `<h2 mat-dialog-title>Remove player</h2>
             <mat-dialog-content class="mat-typography">
               Delete this player?
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemovePlayerDialog {}

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
  declarations: [ TournamentPlayerEditor, RemovePlayerDialog ],
  exports:      [ TournamentPlayerEditor ],
  bootstrap:    [ TournamentPlayerEditor ]
})
export class TournamentPlayerEditorModule {}