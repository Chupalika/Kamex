import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { Tournament } from 'src/app/models/models';

@Component({
  selector: 'tournament-landing-page',
  templateUrl: './tournament_landing_page.html',
  styleUrls: ['./tournament_landing_page.scss']
})
export class TournamentLandingPage {
  tournaments: Tournament[];

  tournamentsTableColumns = ["name", "gameMode", "progress"];
  
  constructor(private tournamentsService: TournamentsService) {
    this.tournaments = [];
  }
  
  ngOnInit() {
    this.refreshTournamentList();
  }
  
  refreshTournamentList() {
    this.tournamentsService.getTournaments().subscribe((tournaments) => {
      this.tournaments = tournaments;
    });
  }
}

@NgModule({
  imports:      [ CommonModule, MatTableModule, RouterModule ],
  declarations: [ TournamentLandingPage ],
  exports:      [ TournamentLandingPage ],
  bootstrap:    [ TournamentLandingPage ]
})
export class TournamentLandingPageModule {}
