import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, inject, NgModule, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Observable } from "rxjs";

import { AppUser, GameMode, Mappool, MappoolSlot, Tournament, TournamentProgress, TournamentRound, TournamentStaffPermission } from 'src/app/models/models';
import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentSlotCardModule } from 'src/app/tournament/components/tournament_slot_card';
import { TournamentSlotEditorModule } from '../components/tournament_slot_editor';
import { TournamentRoundNavBarModule } from 'src/app/tournament/components/tournament_round_nav_bar';
import { getLatestRoundIndex, getSortedMappool, hasPermission, slotStarRating, slotDisplayLength, slotBpm, slotCs, slotHp, slotOd, slotAr } from '../utils';
import { AuthService } from 'src/app/services/auth.service';

const EMPTY_MAPPOOL: Mappool = { _id: "", slots: [] };

@Component({
  selector: 'tournament_mappool_page',
  templateUrl: './tournament_mappool_page.html',
  styleUrls: ['./tournament_mappool_page.scss']
})
export class TournamentMappoolPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  round?: TournamentRound;
  loadingTournament = true;
  loadingRound = false;
  sortedRounds: TournamentRound[] = [];
  selectedRoundIndex: number = -1;
  selectedRoundId: string = "";
  appUser?: AppUser;
  mobileMode = false;
  tableViewFormControl: FormControl;

  TournamentStaffPermission = TournamentStaffPermission;

  readonly dialogService = inject(MatDialog);
  readonly destroyRef = inject(DestroyRef);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private titleService: Title,
    private translocoService: TranslocoService) {
      this.tableViewFormControl = new FormControl(false);
    }

  ngOnInit() {
    this.tournamentsService.loadingTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => { this.loadingTournament = loading; });
    this.tournamentsService.loadingRound$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => { this.loadingRound = loading; });
    this.tournamentsService.currentTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(tournament ? `${tournament.name} Mappools` : 'Kamex');

      if (tournament && this.selectedRoundIndex < 0) {
        this.sortedRounds = [...tournament.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
        const latestRoundIndex = getLatestRoundIndex(this.sortedRounds);
        this.switchSelectedRoundIndex(latestRoundIndex);
      }
    });
    this.tournamentsService.currentRound$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((round) => {
      this.round = round;
      this.selectedRoundIndex = this.sortedRounds.findIndex((r) => r._id === round?._id);
    });
    this.authService.appUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => this.appUser = user);
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
  }

  switchSelectedRoundIndex(index: number) {
    if (this.loadingRound) return;
    this.selectedRoundId = this.sortedRounds[index]?._id ?? "";
    if (this.selectedRoundId) this.tournamentsService.loadOrRefreshTournamentRound(this.selectedRoundId, false, true);
  }

  get mappool() {
    if (!this.round || typeof this.round.mappool === "string") return EMPTY_MAPPOOL;
    return this.round.mappool;
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }

  hasPermission(permission: TournamentStaffPermission): boolean {
    return hasPermission(this.tournament!, this.appUser?.osuId, permission);
  }

  get roundLabels() {
    return this.sortedRounds.map(round => round.name) ?? [];
  }

  get sortedSlots() {
    return getSortedMappool(this.tournament!, this.mappool.slots);
  }

  getCategory(slot: MappoolSlot) {
    return this.tournament?.slotCategories.find((category) => category.name === slot.category);
  }

  copyTable() {
    const slots = this.sortedSlots;
    const header = ['Label', 'Artist', 'Title', 'Difficulty', 'Mapper', 'ID', 'CS', 'AR', 'OD', 'HP' ,'SR' ,'Length' ,'BPM', 'Custom Map', 'Custom Track'];
    const rows = slots.map(slot => {
      const bm = slot.beatmap;
      return [slot.label, bm.artist, bm.title, bm.difficultyName, bm.mapper, bm.beatmapId,
              slotCs(slot), slotAr(slot), slotOd(slot), slotHp(slot), slotStarRating(slot), slotDisplayLength(slot), slotBpm(slot), slot.isCustomMap, slot.isCustomTrack].join('\t');
    });
    const theText = [header.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(theText);
    this.snackBar.open(this.translocoService.translate("tournament.common.tableCopied"), '', { duration: 3000 });
  }

  get mappoolColumns() {
    if ([GameMode.TAIKO, GameMode.MANIA].includes(this.tournament!.gameMode)) {
      return ["label", "artist", "title", "difficulty", "mapper", "id", "sr", "length" ,"bpm", "od", "hp", "isCustomMap", "isCustomTrack"];
    } else {
      return ["label", "artist", "title", "difficulty", "mapper", "id", "sr", "length" ,"bpm", "cs", "ar", "od", "hp", "isCustomMap", "isCustomTrack"];
    }
  }

  slotDisplayLength(slot: MappoolSlot) {
    return slotDisplayLength(slot);
  }

  openSlotEditor() {
    const dialogRef = this.dialogService.open(
      SlotEditorDialog, { data: { acronym: this.acronym, roundId: this.selectedRoundId, tournament: this.tournament, slots: this.mappool.slots } }
    );
  }
}

@Component({
  selector: 'slot-editor-dialog',
  template:
   `<h2 mat-dialog-title>Slot editor</h2>
    <mat-dialog-content class="mat-typography">
      <form [formGroup]="slotEditorForm" class="tourney-form">
        <mat-form-field>
          <mat-label>Slots</mat-label>
          <mat-select formControlName="selectedSlot" (selectionChange)="switchSelectedSlot($event.value)">
            <mat-option value="-1">&lt;New&gt;</mat-option>
            <mat-option *ngFor="let slot of sortedSlots" [value]="slot._id">{{ slot.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
      <tournament-slot-editor
        [slot]="selectedSlot"
        [requestInProgress]="requestInProgress"
        (submit)="submitUpdateSlotForm($event)"
        (remove)="removeSlot($event)"
        (refresh)="refreshBeatmapData($event)"
      >
      </tournament-slot-editor>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
      <button mat-raised-button color="secondary" [mat-dialog-close]="workingSlots">Close</button>
    </mat-dialog-actions>`,
})
export class SlotEditorDialog {
  requestInProgress: boolean = false;

  selectedSlot?: MappoolSlot;
  selectedSlotIndex = -1;
  slotEditorForm: FormGroup;
  selectedSlotFormControl: FormControl;
  workingSlots: MappoolSlot[] = [];

  readonly destroyRef = inject(DestroyRef);

  constructor(
      @Inject(MAT_DIALOG_DATA) public data: { acronym: string, roundId: string, tournament: Tournament, slots: MappoolSlot[] },
      private tournamentsService: TournamentsService,
      private snackBar: MatSnackBar,
      private dialogRef: MatDialogRef<SlotEditorDialog>,
      private translocoService: TranslocoService
  ) {
    this.selectedSlotFormControl = new FormControl("-1");
    this.slotEditorForm = new FormGroup({
      selectedSlot: this.selectedSlotFormControl,
    });

    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close(this.workingSlots);
    });
  }

  ngOnInit() {
    this.tournamentsService.requestInProgress$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((requestInProgress) => { this.requestInProgress = requestInProgress; });
    this.workingSlots = [...this.data.slots];
  }

  get sortedSlots() {
    return getSortedMappool(this.data.tournament, this.workingSlots);
  }

  switchSelectedSlot(slotId: string) {
    const index = this.workingSlots.findIndex((slot) => slot._id === slotId);
    this.selectedSlotIndex = index;
    if (index < 0) this.selectedSlot = undefined;
    else this.selectedSlot = this.workingSlots[index];
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
      if (!this.selectedSlot) {
        this.workingSlots.push(updatedTournamentSlot);
      } else {
        this.workingSlots[this.selectedSlotIndex] = updatedTournamentSlot;
        this.selectedSlot = updatedTournamentSlot;
      }
      this.snackBar.open(this.translocoService.translate(successMessage), "", { duration: 10000 });
    });
  }

  removeSlot(slot: MappoolSlot) {
    this.tournamentsService.removeTournamentSlot(slot._id).subscribe(() => {
      const index = this.workingSlots.findIndex((slot2) => slot2._id === slot._id);
      if (index !== undefined) this.workingSlots.splice(index, 1);
      this.selectedSlotFormControl.setValue("-1");
      this.switchSelectedSlot("-1");
      this.snackBar.open(this.translocoService.translate("tournament.settings.removedSlot"), "", { duration: 10000 });
    });
  }

  refreshBeatmapData(slot: MappoolSlot) {
    this.tournamentsService.refreshTournamentSlot(slot._id).subscribe((refreshedSlot) => {
      const index = this.workingSlots.findIndex((s) => s._id === refreshedSlot._id);
      this.workingSlots[index] = refreshedSlot;
      this.selectedSlot = refreshedSlot;
      this.snackBar.open(this.translocoService.translate("tournament.settings.beatmapDataRefreshed"), "", { duration: 10000 });
    });
  }
}

@NgModule({
    imports: [
        CommonModule,
        ItemSelectorModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTooltipModule,
        ReactiveFormsModule,
        TournamentSlotCardModule,
        TournamentSlotEditorModule,
        TournamentRoundNavBarModule,
        TranslocoModule,
    ],
  declarations: [ TournamentMappoolPage, SlotEditorDialog ],
  exports: [ TournamentMappoolPage ],
  bootstrap: [ TournamentMappoolPage ]
})
export class TournamentMappoolPageModule {}
