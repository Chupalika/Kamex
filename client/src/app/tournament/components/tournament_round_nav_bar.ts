import { Component, NgModule, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from "@angular/material/toolbar";
import { TournamentRound } from '../../models/models';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'tournament-round-nav-bar',
  templateUrl: './tournament_round_nav_bar.html',
  styleUrls: ['./tournament_round_nav_bar.scss']
})
export class TournamentRoundNavBar {
  tourneyPath = "";
  @Input() rounds?: TournamentRound[];
  @Input() selectedRoundIndex: number = 0;
  @Output() switchRound: EventEmitter<number> = new EventEmitter();

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.pipe(
      tap((params: ParamMap) => {
        this.tourneyPath = `/tournament/${params.get("acronym")}` || "";
      })).subscribe();
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  declarations: [ TournamentRoundNavBar ],
  exports:      [ TournamentRoundNavBar ],
  bootstrap:    [ TournamentRoundNavBar ]
})
export class TournamentRoundNavBarModule {}
