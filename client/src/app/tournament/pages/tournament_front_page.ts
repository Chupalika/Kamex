import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { finalize, switchMap, take } from 'rxjs/operators';
import { MarkdownModule } from 'ngx-markdown';

import { AppUser, Tournament } from 'src/app/models/models';
import { TournamentProgress } from 'src/app/models/models';
import { AuthService } from 'src/app/services/auth.service';
import { Title } from '@angular/platform-browser';

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
  requestInProgress = false;

  TournamentProgress = TournamentProgress;

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private titleService: Title) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.acronym = params.get("acronym") || "";
        return this.tournamentsService.getTournament(this.acronym);
      }),
      take(1),
      finalize(() => {this.loading = false;}),
    ).subscribe((tournament) => {
      this.tournament = tournament;
      this.titleService.setTitle(tournament.name);
    });

    this.authService.appUser$.subscribe((user) => this.appUser = user);
  }
}

@NgModule({
    imports: [
        CommonModule,
        MatButtonModule,
        MatMenuModule,
        MarkdownModule,
    ],
  declarations: [ TournamentFrontPage ],
  exports: [ TournamentFrontPage ],
  bootstrap: [ TournamentFrontPage ]
})
export class TournamentFrontPageModule {}
