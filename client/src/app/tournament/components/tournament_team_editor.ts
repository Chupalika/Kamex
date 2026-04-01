import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TournamentPlayer, TournamentTeam } from '../../models/models';
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
  selector: 'tournament-team-editor',
  templateUrl: './tournament_team_editor.html',
  styleUrls: ['./tournament_team_editor.scss']
})
export class TournamentTeamEditor implements OnInit, OnChanges {
  @Input() team?: TournamentTeam;
  @Input() players: TournamentPlayer[] = [];
  @Input() requestInProgress: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();
  @Output() uploadImage: EventEmitter<any> = new EventEmitter();

  editTeamForm: FormGroup;
  nameFormControl: FormControl;
  imageLinkFormControl: FormControl;
  playersFormControl: FormControl;
  captainFormControl: FormControl;
  seedFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.nameFormControl = new FormControl("", [Validators.required]);
    this.imageLinkFormControl = new FormControl("");
    this.playersFormControl = new FormControl([]);
    this.captainFormControl = new FormControl(undefined, [Validators.required]);
    this.seedFormControl = new FormControl("");
    this.editTeamForm = new FormGroup({
      name: this.nameFormControl,
      imageLink: this.imageLinkFormControl,
      players: this.playersFormControl,
      captain: this.captainFormControl,
      seed: this.seedFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["team"] && changes["team"].previousValue !== changes["team"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.nameFormControl.setValue(this.team?.name ?? "");
    this.imageLinkFormControl.setValue(this.team?.imageLink ?? "");
    this.playersFormControl.setValue(this.team?.players.map(player => player._id) ?? []);
    this.captainFormControl.setValue(this.team?.players[0]?._id);
    this.seedFormControl.setValue(this.team?.seed ?? "");
    if (this.disabled) this.editTeamForm.disable();
  }

  updateTeam() {
    const updatedTeam = this.editTeamForm.getRawValue();
    // move the captain to the front
    const captainIndex = updatedTeam.players.findIndex((player: string) => player === this.captainFormControl.value);
    updatedTeam.players.splice(0, 0, ...updatedTeam.players.splice(captainIndex, 1));
    updatedTeam.players = (updatedTeam.players as string[]).map((_id) => ({ _id }));
    this.submit.emit(updatedTeam);
  }

  removeTeam() {
    const dialogRef = this.dialogService.open(RemoveTeamDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.team);
      }
    });
  }

  hasChanges(): boolean {
    return !this.team ||
      this.team.name !== this.nameFormControl.value ||
      (this.team.imageLink ?? "") !== this.imageLinkFormControl.value ||
      JSON.stringify(this.team.players.map(player => player._id)) !== JSON.stringify(this.playersFormControl.value) ||
      this.team.players[0]?._id !== this.captainFormControl.value ||
      (this.team.seed ?? "") !== this.seedFormControl.value;
  }

  getSortedPlayers() {
    const dup = this.players.map(x => x);
    dup.sort((a,b) => a.username < b.username ? -1 : 1);
    return dup;
  }

  getSortedSelectedPlayers() {
    return this.getSortedPlayers().filter((player) => this.playersFormControl.value.includes(player._id));
  }

  onFileSelected(event: any) {
    this.uploadImage.emit(event.target.files[0]);
  }
}

@Component({
  selector: 'remove-team-dialog',
  template: `<h2 mat-dialog-title>Remove team</h2>
             <mat-dialog-content class="mat-typography">
               Delete this team? This will also remove it from matches.
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveTeamDialog {}

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
  declarations: [ TournamentTeamEditor, RemoveTeamDialog ],
  exports:      [ TournamentTeamEditor ],
  bootstrap:    [ TournamentTeamEditor ]
})
export class TournamentTeamEditorModule {}