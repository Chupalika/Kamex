import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from 'src/environments/environment';
import { GameMode, Tournament, TournamentProgress } from '../../models/models';
import { convertDatetimeLocalToDate, convertDateToDatetimeLocal } from '../utils';

@Component({
  selector: 'tournament-settings-editor',
  templateUrl: './tournament_settings_editor.html',
  styleUrls: ['./tournament_settings_editor.scss']
})
export class TournamentSettingsEditor implements OnInit, OnChanges {
  @Input() initialTournament?: Tournament;
  @Input() requestInProgress: boolean = false
  @Output() submit: EventEmitter<any> = new EventEmitter();
  @Output() uploadBanner: EventEmitter<any> = new EventEmitter();
  @Output() uploadCategoryIcon: EventEmitter<any> = new EventEmitter();

  tournamentForm: FormGroup;
  nameFormControl: FormControl;
  acronymFormControl: FormControl;
  unlistedFormControl: FormControl;
  gameModeFormControl: FormControl;
  enableTeamsFormControl: FormControl;
  allowTeamEditsFormControl: FormControl;
  bannerLinkFormControl: FormControl;
  descriptionFormControl: FormControl;
  linksFormControl: FormArray;
  minTeamSizeFormControl: FormControl;
  maxTeamSizeFormControl: FormControl;
  minRankFormControl: FormControl;
  maxRankFormControl: FormControl;
  registrationStartDateFormControl: FormControl;
  registrationEndDateFormControl: FormControl;
  enforceDiscordFormControl: FormControl;
  discordServerIdFormControl: FormControl;
  discordLogChannelIdFormControl: FormControl;
  discordPlayerRoleIdFormControl: FormControl;
  discordMatchReminderChannelIdFormControl: FormControl;
  discordMatchReminderMinutesFormControl: FormControl;
  primaryColorFormControl: FormControl;
  accentColorFormControl: FormControl;
  fontNameFormControl: FormControl;
  slotCategoriesFormControl: FormArray;

  TournamentProgress = TournamentProgress;

  readonly dialogService = inject(MatDialog);

  discordClientId = environment.discordClientId;

  constructor() {
    this.nameFormControl = new FormControl("", [Validators.required]);
    this.acronymFormControl = new FormControl("", [Validators.required]);
    this.unlistedFormControl = new FormControl(false);
    this.gameModeFormControl = new FormControl(GameMode.OSU, [Validators.required]);
    this.enableTeamsFormControl = new FormControl(false, [Validators.required]);
    this.allowTeamEditsFormControl = new FormControl(false, [Validators.required]);
    this.bannerLinkFormControl = new FormControl("");
    this.descriptionFormControl = new FormControl("");
    this.linksFormControl = new FormArray<FormControl>([]);
    this.minTeamSizeFormControl = new FormControl(1, [Validators.required, Validators.min(1)]);
    this.maxTeamSizeFormControl = new FormControl(1, [Validators.required, Validators.min(1)]);
    this.minRankFormControl = new FormControl(0, [Validators.required, Validators.min(0)]);
    this.maxRankFormControl = new FormControl(0, [Validators.required, Validators.min(0)]);
    this.registrationStartDateFormControl = new FormControl(undefined, [Validators.required]);
    this.registrationEndDateFormControl = new FormControl(undefined, [Validators.required]);
    this.enforceDiscordFormControl = new FormControl(false);
    this.discordServerIdFormControl = new FormControl();
    this.discordLogChannelIdFormControl = new FormControl();
    this.discordPlayerRoleIdFormControl = new FormControl();
    this.discordMatchReminderChannelIdFormControl = new FormControl();
    this.discordMatchReminderMinutesFormControl = new FormControl();
    this.primaryColorFormControl = new FormControl("");
    this.accentColorFormControl = new FormControl("");
    this.fontNameFormControl = new FormControl("");
    this.slotCategoriesFormControl = new FormArray<FormControl>([]);
    this.tournamentForm = new FormGroup({
      name: this.nameFormControl,
      acronym: this.acronymFormControl,
      unlisted: this.unlistedFormControl,
      gameMode: this.gameModeFormControl,
      bannerLink: this.bannerLinkFormControl,
      description: this.descriptionFormControl,
      links: this.linksFormControl,
      enableTeams: this.enableTeamsFormControl,
      allowTeamEdits: this.allowTeamEditsFormControl,
      minTeamSize: this.minTeamSizeFormControl,
      maxTeamSize: this.maxTeamSizeFormControl,
      minRank: this.minRankFormControl,
      maxRank: this.maxRankFormControl,
      registrationStartDate: this.registrationStartDateFormControl,
      registrationEndDate: this.registrationEndDateFormControl,
      discordServerId: this.discordServerIdFormControl,
      discordLogChannelId: this.discordLogChannelIdFormControl,
      discordPlayerRoleId: this.discordPlayerRoleIdFormControl,
      discordMatchReminderChannelId: this.discordMatchReminderChannelIdFormControl,
      discordMatchReminderMinutes: this.discordMatchReminderMinutesFormControl,
      enforceDiscord: this.enforceDiscordFormControl,
      primaryColor: this.primaryColorFormControl,
      accentColor: this.accentColorFormControl,
      fontName: this.fontNameFormControl,
      slotCategories: this.slotCategoriesFormControl,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["initialTournament"] && changes["initialTournament"].previousValue !== changes["initialTournament"].currentValue) {
      this.refreshForm();
    }
  }

  ngOnInit() {
    this.refreshForm();
  }

  refreshForm() {
    if (this.initialTournament) {
      this.nameFormControl.setValue(this.initialTournament.name);
      this.acronymFormControl.setValue(this.initialTournament.acronym);
      this.unlistedFormControl.setValue(this.initialTournament.unlisted);
      this.gameModeFormControl.setValue(this.initialTournament.gameMode);
      this.bannerLinkFormControl.setValue(this.initialTournament.bannerLink);
      this.descriptionFormControl.setValue(this.initialTournament.description);
      this.enableTeamsFormControl.setValue(this.initialTournament.enableTeams);
      this.allowTeamEditsFormControl.setValue(this.initialTournament.allowTeamEdits);
      this.minTeamSizeFormControl.setValue(this.initialTournament.registrationSettings.minTeamSize);
      this.maxTeamSizeFormControl.setValue(this.initialTournament.registrationSettings.maxTeamSize);
      this.minRankFormControl.setValue(this.initialTournament.registrationSettings.minRank);
      this.maxRankFormControl.setValue(this.initialTournament.registrationSettings.maxRank);
      this.registrationStartDateFormControl.setValue(convertDateToDatetimeLocal(this.initialTournament.registrationSettings.startDate));
      this.registrationEndDateFormControl.setValue(convertDateToDatetimeLocal(this.initialTournament.registrationSettings.endDate));
      this.enforceDiscordFormControl.setValue(this.initialTournament.registrationSettings.enforceDiscord);
      this.discordServerIdFormControl.setValue(this.initialTournament.discordSettings.serverId);
      this.discordLogChannelIdFormControl.setValue(this.initialTournament.discordSettings.logChannelId);
      this.discordPlayerRoleIdFormControl.setValue(this.initialTournament.discordSettings.playerRoleId);
      this.discordMatchReminderChannelIdFormControl.setValue(this.initialTournament.discordSettings.matchReminderChannelId);
      this.discordMatchReminderMinutesFormControl.setValue(this.initialTournament.discordSettings.matchReminderMinutes);
      this.primaryColorFormControl.setValue(this.initialTournament.theme?.primaryColor || "");
      this.accentColorFormControl.setValue(this.initialTournament.theme?.accentColor || "");
      this.fontNameFormControl.setValue(this.initialTournament.theme?.fontName || "");

      this.getLinksFormArray().clear();
      for (let link of (this.initialTournament.links || [])) {
        this.addLink(link.label, link.link);
      }

      this.getSlotCategoriesFormArray().clear();
      for (let slotCategory of (this.initialTournament.slotCategories || [])) {
        this.addSlotCategory(slotCategory.name, slotCategory.color, slotCategory.iconLink);
      }

      this.acronymFormControl.disable();
      if ([TournamentProgress.REGISTRATION, TournamentProgress.ONGOING, TournamentProgress.CONCLUDED].includes(this.initialTournament.progress)) {
        this.nameFormControl.disable();
        this.gameModeFormControl.disable();
        this.enableTeamsFormControl.disable();
      }
      if ([TournamentProgress.ONGOING, TournamentProgress.CONCLUDED].includes(this.initialTournament.progress)) {
        this.registrationStartDateFormControl.disable();
        this.registrationEndDateFormControl.disable();
        this.minTeamSizeFormControl.disable();
        this.maxTeamSizeFormControl.disable();
        this.minRankFormControl.disable();
        this.maxRankFormControl.disable();
        this.enforceDiscordFormControl.disable();
      }
      if ([TournamentProgress.CONCLUDED].includes(this.initialTournament.progress)) {
        this.allowTeamEditsFormControl.disable();
        this.discordServerIdFormControl.disable();
        this.discordLogChannelIdFormControl.disable();
        this.discordPlayerRoleIdFormControl.disable();
        this.discordMatchReminderChannelIdFormControl.disable();
        this.discordMatchReminderMinutesFormControl.disable();
        this.bannerLinkFormControl.disable();
        this.descriptionFormControl.disable();
        this.primaryColorFormControl.disable();
        this.accentColorFormControl.disable();
        this.fontNameFormControl.disable();
        for (let slotCategoryFormGroup of this.getSlotCategoriesFormGroups()) {
          slotCategoryFormGroup.disable();
        }
        for (let linkFormGroup of this.getLinksFormGroups()) {
          linkFormGroup.disable();
        }
      }
    }
  }

  advanceToNextStage() {
    const dialogRef = this.dialogService.open(AdvanceTourneyStageDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updatedTournament = structuredClone(this.initialTournament)!;
        if (updatedTournament.progress === TournamentProgress.PLANNING) updatedTournament.progress = TournamentProgress.REGISTRATION;
        else if (updatedTournament.progress === TournamentProgress.REGISTRATION) updatedTournament.progress = TournamentProgress.ONGOING;
        else if (updatedTournament.progress === TournamentProgress.ONGOING) updatedTournament.progress = TournamentProgress.CONCLUDED;
        this.submit.emit(updatedTournament);
      }
    });
  }

  updateTournament() {
    const formValues = this.tournamentForm?.getRawValue();
    const updatedTournament: Partial<Tournament> = {
      acronym: formValues.acronym,
      name: formValues.name,
      unlisted: formValues.unlisted,
      gameMode: formValues.gameMode,
      bannerLink: formValues.bannerLink,
      description: formValues.description,
      links: formValues.links,
      enableTeams: formValues.enableTeams,
      allowTeamEdits: formValues.allowTeamEdits,
      registrationSettings: {
        startDate: convertDatetimeLocalToDate(formValues.registrationStartDate),
        endDate: convertDatetimeLocalToDate(formValues.registrationEndDate),
        minTeamSize: formValues.minTeamSize,
        maxTeamSize: formValues.maxTeamSize,
        minRank: formValues.minRank,
        maxRank: formValues.maxRank,
        enforceDiscord: formValues.enforceDiscord,
      },
      discordSettings: {
        serverId: formValues.discordServerId,
        logChannelId: formValues.discordLogChannelId,
        playerRoleId: formValues.discordPlayerRoleId,
        matchReminderChannelId: formValues.discordMatchReminderChannelId,
        matchReminderMinutes: formValues.discordMatchReminderMinutes,
      },
      theme: {
        primaryColor: formValues.primaryColor,
        accentColor: formValues.accentColor,
        fontName: formValues.fontName,
      },
      slotCategories: formValues.slotCategories,
    };
    this.submit.emit(updatedTournament);
  }

  hasChanges(): boolean {
    return !this.initialTournament ||
      this.initialTournament.name !== this.nameFormControl.value ||
      this.initialTournament.unlisted !== this.unlistedFormControl.value ||
      this.initialTournament.gameMode !== this.gameModeFormControl.value ||
      this.initialTournament.bannerLink !== this.bannerLinkFormControl.value ||
      this.initialTournament.description !== this.descriptionFormControl.value ||
      JSON.stringify(this.initialTournament.links ?? []) !== JSON.stringify(this.linksFormControl.value) ||
      this.initialTournament.enableTeams !== this.enableTeamsFormControl.value ||
      this.initialTournament.allowTeamEdits !== this.allowTeamEditsFormControl.value ||
      this.initialTournament.registrationSettings.minTeamSize !== this.minTeamSizeFormControl.value ||
      this.initialTournament.registrationSettings.maxTeamSize !== this.maxTeamSizeFormControl.value ||
      this.initialTournament.registrationSettings.minRank !== this.minRankFormControl.value ||
      this.initialTournament.registrationSettings.maxRank !== this.maxRankFormControl.value ||
      this.initialTournament.registrationSettings.enforceDiscord !== this.enforceDiscordFormControl.value ||
      this.initialTournament.discordSettings.serverId !== this.discordServerIdFormControl.value ||
      this.initialTournament.discordSettings.logChannelId !== this.discordLogChannelIdFormControl.value ||
      this.initialTournament.discordSettings.playerRoleId !== this.discordPlayerRoleIdFormControl.value ||
      this.initialTournament.discordSettings.matchReminderChannelId !== this.discordMatchReminderChannelIdFormControl.value ||
      this.initialTournament.discordSettings.matchReminderMinutes !== this.discordMatchReminderMinutesFormControl.value ||
      convertDateToDatetimeLocal(this.initialTournament.registrationSettings.startDate) !== this.registrationStartDateFormControl.value ||
      convertDateToDatetimeLocal(this.initialTournament.registrationSettings.endDate) !== this.registrationEndDateFormControl.value ||
      this.initialTournament.theme.primaryColor !== this.primaryColorFormControl.value ||
      this.initialTournament.theme.accentColor !== this.accentColorFormControl.value ||
      this.initialTournament.theme.fontName !== this.fontNameFormControl.value ||
      JSON.stringify(this.initialTournament.slotCategories ?? []) !== JSON.stringify(this.slotCategoriesFormControl.value);
  }

  getSlotCategoriesFormArray(): FormArray {
    return this.tournamentForm.controls["slotCategories"] as FormArray;
  }

  getSlotCategoriesFormGroups(): FormGroup[] {
    return this.getSlotCategoriesFormArray().controls as FormGroup[];
  }

  addSlotCategory(name = "", color = "", iconLink = "") {
    const slotCategoryNameFormControl = new FormControl(name, [Validators.required]);
    const slotCategoryColorFormControl = new FormControl(color);
    const slotCategoryIconLinkFormControl = new FormControl(iconLink);
    const slotCategoryForm = new FormGroup({
      name: slotCategoryNameFormControl,
      color: slotCategoryColorFormControl,
      iconLink: slotCategoryIconLinkFormControl,
    });
    this.getSlotCategoriesFormArray().push(slotCategoryForm);
  }

  deleteSlotCategory(index: number) {
    this.getSlotCategoriesFormArray().removeAt(index);
  }

  getColor(index: number) {
    return this.getSlotCategoriesFormArray().at(index).value.color;
  }

  rearrangeSlotCategories(event: CdkDragDrop<string[]>) {
    const theArray = this.getSlotCategoriesFormArray();
    const theControl = theArray.at(event.previousIndex);
    theArray.removeAt(event.previousIndex);
    theArray.insert(event.currentIndex, theControl);
  }

  getLinksFormArray(): FormArray {
    return this.tournamentForm.controls["links"] as FormArray;
  }

  getLinksFormGroups(): FormGroup[] {
    return this.getLinksFormArray().controls as FormGroup[];
  }

  addLink(label = "", link = "") {
    const linkLabelFormControl = new FormControl(label, [Validators.required]);
    const linkLinkFormControl = new FormControl(link, [Validators.required]);
    const linkForm = new FormGroup({
      label: linkLabelFormControl,
      link: linkLinkFormControl,
    });
    this.getLinksFormArray().push(linkForm);
  }

  deleteLink(index: number) {
    this.getLinksFormArray().removeAt(index);
  }

  onFileSelectedBanner(event: any) {
    this.uploadBanner.emit(event.target.files[0]);
  }

  onFileSelectedCategoryIcon(name: string, event: any) {
    this.uploadCategoryIcon.emit({ name, file: event.target.files[0] });
  }

  get isTourneyConcluded(): boolean {
    return this.initialTournament?.progress === TournamentProgress.CONCLUDED;
  }
}

@Component({
  selector: 'advance-tourney-stage-dialog',
  template: `<h2 mat-dialog-title>Advance to next stage?</h2>
             <mat-dialog-content class="mat-typography">
               This will lock some settings in place and cannot be undone.<br>
               Also, any unsaved changes to other settings will not be saved.
             </mat-dialog-content>
             <mat-dialog-actions align="end">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class AdvanceTourneyStageDialog {}

@NgModule({
  imports: [
    CommonModule,
    DragDropModule,
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
  declarations: [ TournamentSettingsEditor, AdvanceTourneyStageDialog ],
  exports:      [ TournamentSettingsEditor ],
  bootstrap:    [ TournamentSettingsEditor ]
})
export class TournamentSettingsEditorModule {}
