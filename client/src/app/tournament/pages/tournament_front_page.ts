import { CommonModule } from '@angular/common';
import { Component, DestroyRef, NgModule, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { TranslocoModule } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';

import { AppUser, Tournament, TournamentProgress } from 'src/app/models/models';
import { AuthService } from 'src/app/services/auth.service';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentPlayerLabelModule } from '../components/tournament_player_label';
import { TournamentTeamLabelModule } from '../components/tournament_team_label';

@Component({
  selector: 'tournament_front_page',
  templateUrl: './tournament_front_page.html',
  styleUrls: ['./tournament_front_page.scss']
})
export class TournamentFrontPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loading = true;
  appUser?: AppUser;

  TournamentProgress = TournamentProgress;

  readonly destroyRef = inject(DestroyRef);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private titleService: Title) {}

  ngOnInit() {
    this.tournamentsService.loadingTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => { this.loading = loading; });
    this.tournamentsService.currentTournament$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(`${tournament?.name ?? 'Kamex'}`);
    });
    this.authService.appUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => this.appUser = user);
  }
}

@NgModule({
    imports: [
        CommonModule,
        MarkdownModule,
        MatButtonModule,
        MatMenuModule,
        MatTableModule,
        TournamentPlayerLabelModule,
        TournamentTeamLabelModule,
        TranslocoModule,
    ],
  declarations: [ TournamentFrontPage ],
  exports: [ TournamentFrontPage ],
  bootstrap: [ TournamentFrontPage ]
})
export class TournamentFrontPageModule {}
