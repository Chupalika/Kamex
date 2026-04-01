import { Component, NgModule, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AppUser } from '../models/models';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'user-settings-dialog',
  templateUrl: './user_settings_dialog.html',
  styleUrls: ['./user_settings_dialog.scss']
})
export class UserSettingsDialog {
  appUser?: AppUser;

  editUserSettingsForm: FormGroup;
  timezoneFormControl: FormControl;
  requestInProgress = false;

  constructor(
      @Inject(MAT_DIALOG_DATA) public data: any,
      private authService: AuthService,
      private snackbar: MatSnackBar) {
    this.appUser = data.appUser;

    this.timezoneFormControl = new FormControl(this.appUser?.timezone, [Validators.required]);
    this.editUserSettingsForm = new FormGroup({
      timezone: this.timezoneFormControl
    });
  }

  refreshUser() {
    this.authService.whoami().subscribe((appUser) => {
      this.appUser = appUser;
    });
  }

  hasChanges(): boolean {
    return this.timezoneFormControl.value !== this.appUser?.timezone;
  }

  unlinkDiscord() {
    this.requestInProgress = true;
    this.authService.logoutDiscord().subscribe((updatedAppUser) => {
      this.appUser = updatedAppUser;
      this.requestInProgress = false;
    });
  }

  linkDiscord() {
    this.requestInProgress = true;
    const width = 600;
    const height = 800;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    const popup = window.open(
      `${this.authService.apiUrl}/login-discord`,
      "",
      `toolbar=no, location=no, directories=no, status=no, menubar=no,
       scrollbars=no, resizable=no, copyhistory=no, width=${width},
       height=${height}, top=${top}, left=${left}`);
    const loop = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(loop);
        this.refreshUser();
        this.requestInProgress = false;
      }
    });
  }

  updateUserSettings() {
    const updatedSettings = this.editUserSettingsForm.getRawValue();
    this.requestInProgress = true;
    this.authService.updateUserSettings(updatedSettings)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackbar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedAppUser) => {
        this.authService.setUser(updatedAppUser);
        this.appUser = updatedAppUser;
        this.requestInProgress = false;
        this.snackbar.open("Successfully updated user settings", "", { duration: 10000 });
      });
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  declarations: [ UserSettingsDialog ],
  exports:      [ UserSettingsDialog ],
  bootstrap:    [ UserSettingsDialog ]
})
export class UserSettingsDialogModule {}
