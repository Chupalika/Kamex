import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, Inject, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TournamentStaffMember, TournamentStaffRole } from '../../models/models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'tournament-staff-member-editor',
  templateUrl: './tournament_staff_member_editor.html',
  styleUrls: ['./tournament_staff_member_editor.scss']
})
export class TournamentStaffMemberEditor implements OnInit, OnChanges {
  @Input() staffMember?: TournamentStaffMember;
  @Input() staffRoles?: TournamentStaffRole[];
  @Input() requestInProgress: boolean = false;
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();

  editStaffMemberForm: FormGroup;
  playerIdFormControl: FormControl;
  rolesFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  constructor() {
    this.playerIdFormControl = new FormControl("", [Validators.required, Validators.min(1)]);
    this.rolesFormControl = new FormControl([]);
    this.editStaffMemberForm = new FormGroup({
      playerId: this.playerIdFormControl,
      roles: this.rolesFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["staffMember"] && changes["staffMember"].previousValue !== changes["staffMember"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.playerIdFormControl.setValue(this.staffMember?.playerId ?? 0);
    this.rolesFormControl.setValue(this.staffMember?.roles.map((role) => role._id) ?? []);
    if (this.staffMember) this.playerIdFormControl.disable();
    else this.playerIdFormControl.enable();
    if (this.disabled) this.editStaffMemberForm.disable();
  }

  updateStaffMember() {
    const updatedStaffMember = this.editStaffMemberForm.getRawValue();
    this.submit.emit(updatedStaffMember);
  }

  removeStaffMember() {
    const dialogRef = this.dialogService.open(RemoveStaffMemberDialog, { data: { staffMember: this.staffMember } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.staffMember);
      }
    });
  }

  hasChanges(): boolean {
    return !this.staffMember ||
      this.staffMember.playerId !== this.playerIdFormControl.value ||
      JSON.stringify(this.staffMember.roles.map((role) => role._id)) !== JSON.stringify(this.rolesFormControl.value);
  }
}

@Component({
  selector: 'remove-staff-member-dialog',
  template: `<h2 mat-dialog-title>Remove staff member</h2>
             <mat-dialog-content class="mat-typography">
               Remove {{ data.staffMember?.username }} from staff members? This will also remove them from matches they're assigned to.
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveStaffMemberDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
  ],
  declarations: [ TournamentStaffMemberEditor, RemoveStaffMemberDialog ],
  exports:      [ TournamentStaffMemberEditor ],
  bootstrap:    [ TournamentStaffMemberEditor ]
})
export class TournamentStaffMemberEditorModule {}