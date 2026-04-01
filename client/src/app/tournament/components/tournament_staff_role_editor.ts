import { Component, NgModule, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, Inject, inject} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TournamentStaffRole, TournamentStaffPermission } from 'src/app/models/models';

@Component({
  selector: 'tournament-staff-role-editor',
  templateUrl: './tournament_staff_role_editor.html',
  styleUrls: ['./tournament_staff_role_editor.scss']
})
export class TournamentStaffRoleEditor implements OnInit, OnChanges {
  @Input() staffRole?: TournamentStaffRole;
  @Input() requestInProgress: boolean = false
  @Input() disabled: boolean = false;
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() remove: EventEmitter<any> = new EventEmitter();

  editStaffRoleForm: FormGroup;
  nameFormControl: FormControl;
  permissionsFormControl: FormControl;

  readonly dialogService = inject(MatDialog);

  permissionChoices = [
    { label: "Edit Tournament Settings", value: TournamentStaffPermission.EDIT_TOURNAMENT_SETTINGS },
    { label: "Register", value: TournamentStaffPermission.REGISTER },
    { label: "Manage Players", value: TournamentStaffPermission.MANAGE_PLAYERS },
    { label: "Manage Teams", value: TournamentStaffPermission.MANAGE_TEAMS },
    { label: "Manage Staff Members", value: TournamentStaffPermission.MANAGE_STAFF_MEMBERS },
    { label: "Manage Staff Roles", value: TournamentStaffPermission.MANAGE_STAFF_ROLES },
    { label: "Manage Rounds", value: TournamentStaffPermission.MANAGE_ROUNDS },
    { label: "Manage Mappool Slots", value: TournamentStaffPermission.MANAGE_SLOTS },
    { label: "Manage Matches", value: TournamentStaffPermission.MANAGE_MATCHES },
    { label: "Submit Matches", value: TournamentStaffPermission.SUBMIT_MATCHES },
    { label: "View WIP Mappools", value: TournamentStaffPermission.VIEW_WIP_MAPPOOLS },
    { label: "View WIP Scoresheets", value: TournamentStaffPermission.VIEW_WIP_SCORESHEETS },
    { label: "Register to match as Referee", value: TournamentStaffPermission.REGISTER_REFEREE },
    { label: "Register to match as Streamer", value: TournamentStaffPermission.REGISTER_STREAMER },
    { label: "Register to match as Commentator", value: TournamentStaffPermission.REGISTER_COMMENTATOR },
    { label: "Manage Stats", value: TournamentStaffPermission.MANAGE_STATS },
  ];

  constructor() {
    this.nameFormControl = new FormControl("", [Validators.required]);
    this.permissionsFormControl = new FormControl([]);
    this.editStaffRoleForm = new FormGroup({
      name: this.nameFormControl,
      permissions: this.permissionsFormControl,
    });
  }

  ngOnInit() {
    this.refreshForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["staffRole"] && changes["staffRole"].previousValue !== changes["staffRole"].currentValue) {
      this.refreshForm();
    }
  }

  refreshForm() {
    this.nameFormControl.setValue(this.staffRole?.name ?? "");
    this.permissionsFormControl.setValue(this.staffRole?.permissions ?? []);
    if (this.disabled) this.editStaffRoleForm.disable();
  }

  updateStaffRole() {
    const updatedStaffRole = this.editStaffRoleForm.getRawValue();
    this.submit.emit(updatedStaffRole);
  }

  removeStaffRole() {
    const dialogRef = this.dialogService.open(RemoveStaffRoleDialog, { data: { staffRole: this.staffRole } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.remove.emit(this.staffRole);
      }
    });
  }

  hasChanges(): boolean {
    return !this.staffRole ||
      this.staffRole.name !== this.nameFormControl.value ||
      JSON.stringify(this.staffRole.permissions) !== JSON.stringify(this.permissionsFormControl.value);
  }
}

@Component({
  selector: 'remove-staff-role-dialog',
  template: `<h2 mat-dialog-title>Remove staff role</h2>
             <mat-dialog-content class="mat-typography">
               Delete the {{ data.staffRole?.name }} staff role? This will also remove the role from staff members that have it.
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RemoveStaffRoleDialog {
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
  declarations: [ TournamentStaffRoleEditor, RemoveStaffRoleDialog ],
  exports:      [ TournamentStaffRoleEditor ],
  bootstrap:    [ TournamentStaffRoleEditor ]
})
export class TournamentStaffRoleEditorModule {}