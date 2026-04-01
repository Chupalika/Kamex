import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, switchMap, take } from 'rxjs/operators';
import { map, of, throwError } from "rxjs";

import { AppUser, Mappool, MappoolSlot, Tournament, TournamentRound, TournamentStaffPermission } from 'src/app/models/models';
import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentSlotCardModule } from 'src/app/tournament/components/tournament_slot_card';
import { TournamentRoundNavBarModule } from 'src/app/tournament/components/tournament_round_nav_bar';
import { getLatestRoundIndex, getSortedMappool, hasPermission } from '../utils';
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

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private titleService: Title) {}

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
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })
      ).subscribe(({ tourneyRound, mappool }) => {
          if (mappool) tourneyRound.mappool = mappool;
          this.loadingRound = false;
          this.tournamentRounds.set(this.selectedRoundId!, tourneyRound);
        });
    }
  }

  getRoundlabels() {
    return this.sortedRounds.map(round => round.name) ?? [];
  }

  getSortedSlots() {
    /*
    // Default sort first to sort the numbers
    let theSlots = structuredClone(this.mappool.slots).sort();
    let sortedSlots: MappoolSlot[] = [];
    for (let slotCategory of this.tournament?.slotCategories || []) {
      for (let slot of theSlots) {
        if (slot.category === slotCategory.name) {
          sortedSlots.push(slot);
          theSlots = theSlots.filter((x: MappoolSlot) => x.label !== slot.label);
        }
      }
    }
    sortedSlots = sortedSlots.concat(theSlots);
    return sortedSlots;
    */
    return getSortedMappool(this.tournament!, this.mappool);
  }

  getCategory(slot: MappoolSlot) {
    return this.tournament?.slotCategories.find((category) => category.name === slot.category);
  }
}

@NgModule({
    imports: [
        CommonModule,
        ItemSelectorModule,
        MatButtonModule,
        TournamentSlotCardModule,
        TournamentRoundNavBarModule,
    ],
  declarations: [ TournamentMappoolPage ],
  exports: [ TournamentMappoolPage ],
  bootstrap: [ TournamentMappoolPage ]
})
export class TournamentMappoolPageModule {}
