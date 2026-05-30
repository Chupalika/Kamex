import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Inject, inject, NgModule, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { catchError, finalize, switchMap, take } from 'rxjs/operators';
import { map, Observable, of, throwError } from "rxjs";

import { AppUser, GameMode, Mappool, MappoolSlot, Tournament, TournamentProgress, TournamentRound, TournamentStaffPermission } from 'src/app/models/models';
import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentSlotCardModule } from 'src/app/tournament/components/tournament_slot_card';
import { TournamentSlotEditorModule } from '../components/tournament_slot_editor';
import { TournamentRoundNavBarModule } from 'src/app/tournament/components/tournament_round_nav_bar';
import { getLatestRoundIndex, getSortedMappool, hasPermission, slotStarRating, slotDisplayLength, slotBpm, slotCs, slotHp, slotOd, slotAr } from '../utils';
import { AuthService } from 'src/app/services/auth.service';
import { Title } from '@angular/platform-browser';

const EMPTY_MAPPOOL: Mappool = { _id: "", slots: [] };

@Component({
  selector: 'tournament_mappool_page',
  templateUrl: './tournament_mappool_page.html',
  styleUrls: ['./tournament_mappool_page.scss']
})
export class TournamentMappoolPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loadingTournament = true;
  loadingRound = false;
  sortedRounds: TournamentRound[] = [];
  selectedRoundIndex: number = 0;
  selectedRoundId: string = "";
  tournamentRounds: Map<string, TournamentRound> = new Map(); // keyed by _id
  appUser?: AppUser;
  mobileMode = false;
  tableViewFormControl: FormControl;

  TournamentStaffPermission = TournamentStaffPermission;

  readonly dialogService = inject(MatDialog);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private titleService: Title,
    private translocoService: TranslocoService) {
      this.tableViewFormControl = new FormControl(false);
    }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.acronym = params.get("acronym") || "";
        return this.tournamentsService.getTournament(this.acronym);
      }),
      take(1),
      finalize(() => {this.loadingTournament = false;}),
    ).subscribe((tournament) => {
      this.tournament = tournament;
      this.sortedRounds = [...tournament!.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
      this.titleService.setTitle(`${tournament.name} Mappools`);
      const latestRoundIndex = getLatestRoundIndex(this.sortedRounds);
      this.switchSelectedRoundIndex(latestRoundIndex);
    });
    this.authService.appUser$.subscribe((user) => this.appUser = user);
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
  }

  get tourneyRound() {
    return this.tournamentRounds.get(this.selectedRoundId);
  }

  get mappool() {
    return this.tourneyRound?.mappool || EMPTY_MAPPOOL;
  }

  get canViewWipMappool() {
    return hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.VIEW_WIP_MAPPOOLS);
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }

  hasPermission(permission: TournamentStaffPermission): boolean {
    return hasPermission(this.tournament!, this.appUser?.osuId, permission);
  }

  switchSelectedRoundIndex(index: number) {
    if (this.loadingRound) return;
    this.selectedRoundIndex = index;
    this.selectedRoundId = this.sortedRounds[index]?._id ?? "";
    if (this.selectedRoundId && !this.tournamentRounds.has(this.selectedRoundId)) {
      this.loadingRound = true;
      this.tournamentsService.getTournamentRound(this.tournament!.acronym, this.selectedRoundId).pipe(
        switchMap((tourneyRound) => {
          // fetch mappool if it's wip but user has permission to view wip pool
          let theMappool = tourneyRound.mappool;
          if (typeof theMappool === "string") {
            if (this.canViewWipMappool) {
              return this.tournamentsService.getTournamentMappool(this.tournament!.acronym, theMappool).pipe(map((mappool) => ({ tourneyRound, mappool })));
            } else {
              tourneyRound.mappool = EMPTY_MAPPOOL;
              return of({ tourneyRound, mappool: null });
            }
          } else {
            return of({ tourneyRound, mappool: theMappool });
          }
        }),
        catchError((error) => {
          this.loadingRound = false;
          this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
          return throwError(error);
        })
      ).subscribe(({ tourneyRound, mappool }) => {
          if (mappool) tourneyRound.mappool = mappool;
          this.loadingRound = false;
          this.tournamentRounds.set(this.selectedRoundId!, tourneyRound);
        });
    }
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
    const header = ['Label', 'Artist', 'Title', 'Difficulty', 'Mapper', 'ID', 'CS', 'AR', 'OD', 'HP' ,'SR' ,'Length' ,'BPM'];
    const rows = slots.map(slot => {
      const bm = slot.beatmap;
      return [slot.label, bm.artist, bm.title, bm.difficultyName, bm.mapper, bm.beatmapId,
              slotCs(slot), slotAr(slot), slotOd(slot), slotHp(slot), slotStarRating(slot), slotDisplayLength(slot), slotBpm(slot)].join('\t');
    });
    const theText = [header.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(theText);
    this.snackBar.open(this.translocoService.translate("tournament.common.tableCopied"), '', { duration: 3000 });
  }

  get mappoolColumns() {
    if ([GameMode.TAIKO, GameMode.MANIA].includes(this.tournament!.gameMode)) {
      return ["label", "artist", "title", "difficulty", "mapper", "id", "sr", "length" ,"bpm", "od", "hp"];
    } else {
      return ["label", "artist", "title", "difficulty", "mapper", "id", "sr", "length" ,"bpm", "cs", "ar", "od", "hp"];
    }
  }

  slotDisplayLength(slot: MappoolSlot) {
    return slotDisplayLength(slot);
  }

  openSlotEditor() {
    const dialogRef = this.dialogService.open(
      SlotEditorDialog, { data: { acronym: this.acronym, roundId: this.selectedRoundId, tournament: this.tournament, slots: this.mappool.slots } }
    );
    dialogRef.afterClosed().subscribe((updatedSlots: MappoolSlot[]) => {
      if (updatedSlots) {
        this.mappool.slots = updatedSlots;
      }
    });
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
    this.requestInProgress = true;

    let request: Observable<MappoolSlot>;
    let successMessage = "";
    if (!this.selectedSlot) {
      request = this.tournamentsService.addTournamentSlot(this.data.acronym, this.data.roundId, formData.beatmapId, formData);
      successMessage = "tournament.settings.addedSlot";
    } else {
      request = this.tournamentsService.editTournamentSlot(this.data.acronym, this.data.roundId, this.selectedSlot._id, formData.beatmapId, formData);
      successMessage = "tournament.settings.editedSlot";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentSlot) => {
      this.requestInProgress = false;
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
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentSlot(this.data.acronym, this.data.roundId, slot._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(this.translocoService.translate("common.requestFailed", { error: error.error.message }), "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.workingSlots.findIndex((slot2) => slot2._id === slot._id);
        if (index !== undefined) this.workingSlots.splice(index, 1);
        this.selectedSlotFormControl.setValue("-1");
        this.switchSelectedSlot("-1");
        this.snackBar.open(this.translocoService.translate("tournament.settings.removedSlot"), "", { duration: 10000 });
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
