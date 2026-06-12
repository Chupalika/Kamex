import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, NgModule, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Observable } from "rxjs";

import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentMatchEditorModule } from "../components/tournament_match_editor";
import { TournamentPlayerEditorModule } from '../components/tournament_player_editor';
import { TournamentSubmitMatchEditorModule } from '../components/tournament_submit_match_editor';
import { TournamentSlotEditorModule } from "../components/tournament_slot_editor";
import { TournamentRoundEditorModule } from "../components/tournament_round_editor";
import { TournamentStaffMemberEditorModule } from "../components/tournament_staff_member_editor";
import { TournamentStaffRoleEditorModule } from "../components/tournament_staff_role_editor";
import { TournamentSettingsEditorModule } from "../components/tournament_settings_editor";
import { TournamentTeamEditorModule } from "../components/tournament_team_editor";
import { AppUser, GameMode, MappoolSlot, Tournament, TournamentMatch, TournamentPlayer, TournamentRound, TournamentStaffMember, TournamentStaffRole, TournamentStaffPermission, TournamentTeam, TournamentProgress } from '../../models/models';
import { NavBarModule } from "../../nav_bar/nav_bar";
import { AuthService } from 'src/app/services/auth.service';
import { TournamentsService } from '../../services/tournaments.service';
import { getSortedMappool } from '../utils';

@Component({
  selector: 'tournament-settings-page',
  templateUrl: './tournament_settings_page.html',
  styleUrls: ['./tournament_settings_page.scss']
})
export class TournamentSettingsPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loadingTournament = true;
  loadingRound = false;
  requestInProgress = false;
  appUser?: AppUser;
  players: TournamentPlayer[] = [];
  selectedPlayer?: TournamentPlayer;
  teams: TournamentTeam[] = [];
  selectedTeam?: TournamentTeam;
  staffMembers: TournamentStaffMember[] = [];
  selectedStaffMember?: TournamentStaffMember;
  staffRoles: TournamentStaffRole[] = [];
  selectedStaffRole?: TournamentStaffRole;
  rounds: TournamentRound[] = [];
  selectedRound?: TournamentRound;
  selectedRoundIndex = -1;
  slots: MappoolSlot[] = [];
  selectedSlot?: MappoolSlot;
  selectedSlotIndex = -1;
  matches: TournamentMatch[] = [];
  selectedMatch?: TournamentMatch;
  selectedMatchIndex = -1;

  playerEditorForm: FormGroup;
  selectedPlayerFormControl: FormControl;
  teamEditorForm: FormGroup;
  selectedTeamFormControl: FormControl;
  staffMemberEditorForm: FormGroup;
  selectedStaffMemberFormControl: FormControl;
  staffRoleEditorForm: FormGroup;
  selectedStaffRoleFormControl: FormControl;

  TournamentStaffPermission = TournamentStaffPermission;

  readonly dialogService = inject(MatDialog);
  readonly destroyRef = inject(DestroyRef);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private translocoService: TranslocoService) {
      this.selectedPlayerFormControl = new FormControl("-1");
      this.playerEditorForm = new FormGroup({ selectedPlayer: this.selectedPlayerFormControl });
      this.selectedPlayerFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((playerId) => {
        const index = this.players.findIndex((player) => player.playerId === playerId);
        if (index < 0) this.selectedPlayer = undefined;
        this.selectedPlayer = this.players[index];
      });

      this.selectedTeamFormControl = new FormControl("");
      this.teamEditorForm = new FormGroup({ selectedTeam: this.selectedTeamFormControl });
      this.selectedTeamFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((teamId) => {
        const index = this.teams.findIndex((team) => team._id === teamId);
        if (index < 0) this.selectedTeam = undefined;
        this.selectedTeam = this.teams[index];
      });

      this.selectedStaffMemberFormControl = new FormControl("-1");
      this.staffMemberEditorForm = new FormGroup({ selectedStaffMember: this.selectedStaffMemberFormControl });
      this.selectedStaffMemberFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((staffMemberId) => {
        const index = this.staffMembers.findIndex((member) => member.playerId === staffMemberId);
        if (index < 0) this.selectedStaffMember = undefined;
        this.selectedStaffMember = this.staffMembers[index];
      });

      this.selectedStaffRoleFormControl = new FormControl("");
      this.staffRoleEditorForm = new FormGroup({ selectedStaffRole: this.selectedStaffRoleFormControl });
      this.selectedStaffRoleFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((staffRoleId) => {
        const index = this.staffRoles.findIndex((role) => role._id === staffRoleId);
        if (index < 0) this.selectedStaffRole = undefined;
        this.selectedStaffRole = this.staffRoles[index];
      });
    }

  ngOnInit() {
    this.tournamentsService.loadingTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => { this.loadingTournament = loading; });
    this.tournamentsService.loadingRound$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => { this.loadingRound = loading; });
    this.tournamentsService.requestInProgress$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((requestInProgress) => { this.requestInProgress = requestInProgress; });
    this.tournamentsService.currentTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(tournament ? `${tournament.name} Settings` : 'Kamex');
      if (tournament) this.refreshTournamentHelper(tournament);
    });
    this.tournamentsService.currentRound$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((round) => {
      this.selectedRound = round;
      this.selectedRoundIndex = this.rounds.findIndex((r) => r._id === round?._id);
      if (round) this.switchRoundHelper();
    });
    this.authService.appUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => this.appUser = user);
    this.tournamentsService.unselectCurrentRound();
  }

  get currentStaffMember() {
    return this.tournament?.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId);
  }

  hasPermission(permission: TournamentStaffPermission) {
    return (this.appUser && this.appUser.osuId === this.tournament?.ownerId) ||
           (this.currentStaffMember && this.currentStaffMember.roles.some((role) => role.permissions.includes(permission)));
  }

  isMultiMode() {
    return this.tournament?.gameMode === GameMode.ALL;
  }

  submitEditTournamentForm(partialTournament: Partial<Tournament>) {
    if (!partialTournament.acronym) return;
    this.tournamentsService.editTournament(partialTournament).subscribe((updatedTournament) => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.tourneySettingsEdited"), "", { duration: 10000 });
    });
  }

  refreshAllPlayerData() {
    const dialogRef = this.dialogService.open(RefreshPlayerDataDialog);
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tournamentsService.refreshPlayers(this.tournament!.acronym).subscribe(() => {
          this.snackBar.open(this.translocoService.translate("tournament.settings.playerDataRefreshed"), "", { duration: 10000 });
          this.tournamentsService.loadOrRefreshTournament(this.tournament!.acronym, true);
        });
      }
    });
  }

  refreshPlayerData(player: TournamentPlayer) {
    this.tournamentsService.refreshPlayer(this.tournament!.acronym, player.playerId).subscribe((refreshedPlayer) => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.playerDataRefreshed"), "", { duration: 10000 });
    });
  }

  refreshTournamentHelper(tourney: Tournament) {
    this.players = [...tourney.players].sort((a, b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    this.teams = [...tourney.teams].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    this.staffMembers = [...tourney.staffMembers].sort((a, b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    this.staffRoles = [...tourney.staffRoles].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    this.rounds = [...tourney.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
    // refresh selections or reset them if they don't exist anymore
    if (!tourney.players.find((p) => p.playerId === this.selectedPlayer?.playerId)) this.selectedPlayerFormControl.patchValue(-1);
    else this.selectedPlayerFormControl.patchValue(this.selectedPlayer!.playerId);
    if (!tourney.teams.find((t) => t._id === this.selectedTeam?._id)) this.selectedTeamFormControl.patchValue("");
    else this.selectedTeamFormControl.patchValue(this.selectedTeam!._id);
    if (!tourney.staffMembers.find((s) => s.playerId === this.selectedStaffMember?.playerId)) this.selectedStaffMemberFormControl.patchValue(-1);
    else this.selectedStaffMemberFormControl.patchValue(this.selectedStaffMember!.playerId);
    if (!tourney.staffRoles.find((r) => r._id === this.selectedStaffRole?._id)) this.selectedStaffRoleFormControl.patchValue(-1);
    else this.selectedStaffRoleFormControl.patchValue(this.selectedStaffRole!._id);
    if (!tourney.rounds.find((r) => r._id === this.selectedRound?._id)) this.switchSelectedTournamentRound(-1);
    else this.switchSelectedTournamentRound(this.selectedRoundIndex);
  }

  get playerLabels() {
    return this.players.map((player) => player.username);
  }

  submitUpdatePlayerForm(partialPlayer: Partial<TournamentPlayer>) {
    if (!partialPlayer.playerId) return;

    let request: Observable<TournamentPlayer>;
    let successMessage = "";
    if (!this.selectedPlayer) {
      request = this.tournamentsService.addTournamentPlayer(partialPlayer.playerId, partialPlayer);
      successMessage = "tournament.settings.addedPlayer";
    } else {
      request = this.tournamentsService.editTournamentPlayer(this.selectedPlayer.playerId, partialPlayer);
      successMessage = "tournament.settings.editedPlayer";
    }

    request.subscribe((updatedTournamentPlayer) => {
      this.selectedPlayerFormControl.patchValue(updatedTournamentPlayer.playerId);
      this.snackBar.open(this.translocoService.translate(successMessage, { username: updatedTournamentPlayer.username }), "", { duration: 10000 });
    });
  }

  removePlayer(player: TournamentPlayer) {
    this.tournamentsService.removeTournamentPlayer(player.playerId).subscribe(() => {
      this.selectedPlayerFormControl.patchValue(-1);
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedPlayer", { username: player.username }), "", { duration: 10000 });
    });
  }

  get teamLabels() {
    return this.teams.map((team) => team.name);
  }

  submitUpdateTeamForm(partialTeam: Partial<TournamentTeam>) {
    if (!partialTeam.name) return;

    let request: Observable<TournamentTeam>;
    let successMessage = "";
    if (!this.selectedTeam) {
      request = this.tournamentsService.addTournamentTeam(partialTeam);
      successMessage = "tournament.settings.addedTeam";
    } else {
      request = this.tournamentsService.editTournamentTeam(this.selectedTeam._id, partialTeam);
      successMessage = "tournament.settings.editedTeam";
    }

    request.subscribe((updatedTournamentTeam) => {
      this.selectedTeamFormControl.patchValue(updatedTournamentTeam._id);
      this.snackBar.open(this.translocoService.translate(successMessage, { teamName: updatedTournamentTeam.name }), "", { duration: 10000 });
    });
  }

  removeTeam(team: TournamentTeam) {
    this.tournamentsService.removeTournamentTeam(team._id).subscribe(() => {
      this.selectedTeamFormControl.patchValue("");
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedTeam", { teamName: team.name }), "", { duration: 10000 });
    });
  }

  uploadTeamImage(event: any) {
    this.tournamentsService.uploadTeamImage(this.selectedTeam!._id, event).subscribe((updatedTeam) => {
      this.selectedTeamFormControl.patchValue(updatedTeam._id);
      this.snackBar.open(this.translocoService.translate("tournament.registration.teamImageUpdated"), "", { duration: 10000 });
    });
  }

  uploadTourneyBanner(event: any) {
    this.tournamentsService.uploadTourneyBanner(event).subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.tourneyBannerUpdated"), "", { duration: 10000 });
    });
  }

  uploadTourneyIcon(event: any) {
    this.tournamentsService.uploadTourneyIcon(event).subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.tourneyIconUpdated"), "", { duration: 10000 });
    });
  }

  uploadCategoryIcon(event: any) {
    this.tournamentsService.uploadTourneyCategoryIcon(event.name, event.file).subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.categoryIconUpdated"), "", { duration: 10000 });
    });
  }

  get staffMemberLabels() {
    return this.staffMembers.map((member) => member.username) ?? [];
  }

  submitUpdateStaffMemberForm(formData: any) {
    if (!formData.playerId) return;

    let request: Observable<TournamentStaffMember>;
    let successMessage = "";
    if (!this.selectedStaffMember) {
      request = this.tournamentsService.addTournamentStaffMember(formData.playerId, formData.roles);
      successMessage = "tournament.settings.addedStaffMember";
    } else {
      request = this.tournamentsService.editTournamentStaffMember(formData.playerId, formData.roles);
      successMessage = "tournament.settings.editedStaffMember";
    }

    request.subscribe((updatedStaffMember) => {
      this.selectedStaffMemberFormControl.patchValue(updatedStaffMember.playerId);
      this.snackBar.open(this.translocoService.translate(successMessage, { username: updatedStaffMember.username }), "", { duration: 10000 });
    });
  }

  removeStaffMember(staffMember: TournamentStaffMember) {
    this.tournamentsService.removeTournamentStaffMember(staffMember.playerId).subscribe(() => {
      this.selectedStaffMemberFormControl.patchValue(-1);
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedStaffMember", { username: staffMember.username }), "", { duration: 10000 });
    });
  }

  get staffRoleLabels() {
    return this.staffRoles.map((role) => role.name);
  }

  submitUpdateStaffRoleForm(formData: any) {
    if (!formData.name) return;

    let request: Observable<TournamentStaffRole>;
    let successMessage = "";
    if (!this.selectedStaffRole) {
      request = this.tournamentsService.addTournamentStaffRole(formData.name, formData.permissions);
      successMessage = "tournament.settings.addedStaffRole";
    } else {
      request = this.tournamentsService.editTournamentStaffRole(this.selectedStaffRole._id, formData.name, formData.permissions);
      successMessage = "tournament.settings.editedStaffRole";
    }

    request.subscribe((updatedStaffRole) => {
      this.selectedStaffRoleFormControl.patchValue(updatedStaffRole._id);
      this.snackBar.open(this.translocoService.translate(successMessage, { roleName: updatedStaffRole.name }), "", { duration: 10000 });
    });
  }

  removeStaffRole(staffRole: TournamentStaffRole) {
    this.tournamentsService.removeTournamentStaffRole(staffRole._id).subscribe(() => {
      this.selectedStaffRoleFormControl.patchValue("");
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedStaffRole", { roleName: staffRole.name }), "", { duration: 10000 });
    });
  }

  get roundLabels() {
    return this.rounds.map(round => round.name);
  }

  switchSelectedTournamentRound(index: number) {
    if (this.loadingRound) return;
    if (index < 0) this.tournamentsService.unselectCurrentRound();
    else {
      const roundId = this.rounds[index]._id;
      this.tournamentsService.loadOrRefreshTournamentRound(roundId, false, true);
    }
  }
  
  switchRoundHelper() {
    this.slots = getSortedMappool(this.tournament!, this.selectedRound!.mappool.slots);
    this.matches = [...this.selectedRound!.matches].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));

    // refresh selections or reset them if they don't exist anymore
    this.switchSelectedTournamentSlot(this.selectedSlot?._id);
    this.switchSelectedTournamentMatch(this.selectedMatch?._id);
  }

  submitUpdateRoundForm(partialRound: Partial<TournamentRound>) {
    if (!partialRound.name) return;

    let request: Observable<TournamentRound>;
    let successMessage = "";
    if (!this.selectedRound) {
      request = this.tournamentsService.createTournamentRound(partialRound);
      successMessage = "tournament.settings.createdTournamentRound";
    } else {
      request = this.tournamentsService.editTournamentRound(partialRound);
      successMessage = "tournament.settings.editedTournamentRound";
    }

    request.subscribe((updatedTournamentRound) => {
      this.snackBar.open(this.translocoService.translate(successMessage), "", { duration: 10000 });
      // reload mappool
      if (this.selectedRound) this.tournamentsService.loadOrRefreshTournamentRound(this.selectedRound._id, true, true);
    });
  }

  removeRound(round: TournamentRound) {
    this.tournamentsService.removeTournamentRound().subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedTournamentRound"), "", { duration: 10000 });
    });
  }

  get slotLabels() {
    return this.slots.map((slot) => slot.label) || [];
  }

  switchSelectedTournamentSlot(idOrIndex: string|number|undefined) {
    let index;
    switch (typeof idOrIndex) {
      case "string": { index = this.slots.findIndex((s) => s._id === idOrIndex); break; }
      case "number": { index = idOrIndex; break; }
      default: index = -1;
    }
    this.selectedSlotIndex = index;
    if (index < 0) this.selectedSlot = undefined;
    this.selectedSlot = this.slots[index];
  }

  submitUpdateSlotForm(formData: any) {
    if (!formData.label) return;

    let request: Observable<MappoolSlot>;
    let successMessage = "";
    if (!this.selectedSlot) {
      request = this.tournamentsService.addTournamentSlot(formData.beatmapId, formData);
      successMessage = "tournament.settings.addedSlot";
    } else {
      request = this.tournamentsService.editTournamentSlot(this.selectedSlot._id, formData.beatmapId, formData);
      successMessage = "tournament.settings.editedSlot";
    }

    request.subscribe((updatedTournamentSlot) => {
      this.snackBar.open(this.translocoService.translate(successMessage), "", { duration: 10000 });
    });
  }

  removeSlot(slot: MappoolSlot) {
    this.tournamentsService.removeTournamentSlot(slot._id).subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedSlot"), "", { duration: 10000 });
    });
  }

  refreshBeatmapData(slot: MappoolSlot) {
    this.tournamentsService.refreshTournamentSlot(slot._id).subscribe((refreshedSlot) => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.beatmapDataRefreshed"), "", { duration: 10000 });
    });
  }

  get matchLabels() {
    return this.matches.map((match) => match.id);
  }

  switchSelectedTournamentMatch(idOrIndex: string|number|undefined) {
    let index;
    switch (typeof idOrIndex) {
      case "string": { index = this.matches.findIndex((m) => m._id === idOrIndex); break; }
      case "number": { index = idOrIndex; break; }
      default: index = -1;
    }
    this.selectedMatchIndex = index;
    if (index < 0) this.selectedMatch = undefined;
    this.selectedMatch = this.matches[index];
  }

  submitUpdateMatchForm(partialMatch: Partial<TournamentMatch>) {
    if (!partialMatch.id) return;

    let request: Observable<TournamentMatch>;
    let successMessage = "";

    if (!this.selectedMatch) {
      request = this.tournamentsService.addTournamentMatch(partialMatch);
      successMessage = "tournament.settings.addedMatch";
    } else {
      request = this.tournamentsService.editTournamentMatch(this.selectedMatch._id, partialMatch);
      successMessage = "tournament.settings.editedMatch";
    }

    request.subscribe((updatedTournamentMatch) => {
      this.snackBar.open(this.translocoService.translate(successMessage), "", { duration: 10000 });
    });
  }

  removeMatch(match: TournamentMatch) {
    this.tournamentsService.removeTournamentMatch(match._id).subscribe(() => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedMatch"), "", { duration: 10000 });
    });
  }

  submitMatch(formData: any) {
    if (!formData.id) return;
    this.tournamentsService.submitMatch(formData).subscribe((updatedTournamentMatch) => {
      this.snackBar.open(this.translocoService.translate("tournament.settings.submittedMatch"), "", { duration: 10000 });
    });
  }

  get isTeamsEnabled(): boolean {
    return this.tournament?.enableTeams ?? false;
  }

  get isTourneyPlanning(): boolean {
    return this.tournament?.progress === TournamentProgress.PLANNING;
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }
}

@Component({
  selector: 'refresh-player-data-dialog',
  template: `<h2 mat-dialog-title>Refresh player data</h2>
             <mat-dialog-content class="mat-typography">
               Refresh the usernames, countries, and ranks of all registered players?
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RefreshPlayerDataDialog {}

@NgModule({
  imports: [
    CommonModule,
    ItemSelectorModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    NavBarModule,
    ReactiveFormsModule,
    TournamentMatchEditorModule,
    TournamentPlayerEditorModule,
    TournamentSubmitMatchEditorModule,
    TournamentSlotEditorModule,
    TournamentRoundEditorModule,
    TournamentSettingsEditorModule,
    TournamentStaffMemberEditorModule,
    TournamentStaffRoleEditorModule,
    TournamentTeamEditorModule,
    TranslocoModule,
  ],
  declarations: [ TournamentSettingsPage, RefreshPlayerDataDialog ],
  exports: [ TournamentSettingsPage ],
  bootstrap: [ TournamentSettingsPage ]
})
export class TournamentSettingsPageModule {}
