import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { finalize, switchMap, take } from 'rxjs/operators';

import { Tournament, TournamentPlayer, TournamentStaffMember, TournamentTeam } from 'src/app/models/models';
import { NavBarModule } from "src/app/nav_bar/nav_bar";
import { TournamentsService } from 'src/app/services/tournaments.service';
import { TournamentPlayerCardModule } from 'src/app/tournament/components/tournament_player_card';
import { TournamentTeamCardModule } from 'src/app/tournament/components/tournament_team_card';
import { TournamentStaffMemberCardModule } from 'src/app/tournament/components/tournament_staff_member_card';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'tournament_participants_page',
  templateUrl: './tournament_participants_page.html',
  styleUrls: ['./tournament_participants_page.scss']
})
export class TournamentParticipantsPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loadingTournament = true;
  players: TournamentPlayer[] = [];
  teams: TournamentTeam[] = [];
  staffMembers: TournamentStaffMember[] = [];
  sortMethodFormControl: FormControl;
  filterFormControl: FormControl;
  displayFormControl: FormControl;
  mobileMode = false;

  constructor(
    private tournamentsService: TournamentsService,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver,
    private titleService: Title) {
      this.sortMethodFormControl = new FormControl("rank");
      this.filterFormControl = new FormControl("");
      this.displayFormControl = new FormControl("players");
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
      this.titleService.setTitle(`${tournament.name} Participants`);
      
      this.sortPlayers();
      this.sortTeams();
      this.sortStaffMembers();
      this.filterStaffMembers();
    });
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
  }

  private playerNameCompare = (a: TournamentPlayer|TournamentStaffMember, b: TournamentPlayer|TournamentStaffMember) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1;
  private teamNameCompare = (a: TournamentTeam, b: TournamentTeam) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  private countryCompare = (a: TournamentPlayer, b: TournamentPlayer) => {
    const ac = a.country?.toLowerCase() ?? "";
    const bc = b.country?.toLowerCase() ?? "";
    if (ac === bc) return 0;
    else return ac < bc ? -1 : 1;
  };
  private seedCompare = (a: TournamentPlayer|TournamentTeam, b: TournamentPlayer|TournamentTeam) => {
    const aSeed = a.seed ? parseInt(a.seed) : Number.MAX_SAFE_INTEGER;
    const bSeed = b.seed ? parseInt(b.seed) : Number.MAX_SAFE_INTEGER;
    if (aSeed !== bSeed) return aSeed - bSeed;
    else return (a.seed?.toString() ?? "").localeCompare(b.seed?.toString() ?? "");
  }

  sortPlayers() {
    if (this.sortMethodFormControl.value === "name") {
      this.players = [...this.tournament!.players].sort(this.playerNameCompare);
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.players = [...this.tournament!.players].sort((a,b) => this.countryCompare(a,b) || this.playerNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.players = [...this.tournament!.players].sort((a,b) => this.seedCompare(a,b) || this.playerNameCompare(a,b));
    }
    // sort by rank by default
    else {
      this.players = [...this.tournament!.players].sort((a,b) => (a.taikoRank ?? 2147483647) - (b.taikoRank ?? 2147483647));
    }
  }

  sortTeams() {
    if (this.sortMethodFormControl.value === "name") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.teamNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "country") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.countryCompare(a.players[0], b.players[0]) || this.teamNameCompare(a,b));
    }
    else if (this.sortMethodFormControl.value === "seed") {
      this.teams = [...this.tournament!.teams].sort((a,b) => this.seedCompare(a, b) || this.teamNameCompare(a,b));
    }
    // sort by average rank by default
    else {
      this.teams = [...this.tournament!.teams].sort(
        (a,b) => (a.players.reduce((acc, player) => acc + player.taikoRank, 0) / a.players.length) - (b.players.reduce((acc, player) => acc + player.taikoRank, 0) / b.players.length));
    }
  }

  sortStaffMembers() {
    this.staffMembers = [...this.tournament!.staffMembers].sort((a,b) => this.playerNameCompare(a,b));
  }

  filterStaffMembers() {
    if (this.filterFormControl.value) {
      this.staffMembers = [...this.staffMembers].filter((staffMember) => staffMember.roles.some((role) => role.name === this.filterFormControl.value));
    } else {
      this.staffMembers = [...this.staffMembers];
    }
  }
  
  switchSortMethod(changeEvent: MatSelectChange) {
    this.sortPlayers();
    this.sortTeams();
    this.sortStaffMembers();
    this.filterStaffMembers();
  }

  get participantsCountText() {
    switch(this.displayFormControl.value) {
      case "players":
        return `${this.players.length} Players`;
      case "teams":
        return `${this.teams.length} Teams`;
      case "staff":
        return `${this.staffMembers.length} Staff Members`;
      default:
        return "";
    }
  }

  getPlayerTeams(playerId: number) {
    return this.teams.filter((team) => team.players.some(player => player.playerId === playerId));
  }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        NavBarModule,
        ReactiveFormsModule,
        TournamentPlayerCardModule,
        TournamentTeamCardModule,
        TournamentStaffMemberCardModule,
    ],
  declarations: [ TournamentParticipantsPage ],
  exports: [ TournamentParticipantsPage ],
  bootstrap: [ TournamentParticipantsPage ]
})
export class TournamentParticipantsPageModule {}
