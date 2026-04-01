import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, switchMap, take } from 'rxjs/operators';
import { throwError } from "rxjs";

import { TournamentMatchCardModule } from '../components/tournament_match_card';
import { AppUser, Tournament, TournamentMatch, TournamentProgress, TournamentRound, TournamentStaffPermission } from 'src/app/models/models';
import { ItemSelectorModule } from 'src/app/components/item_selector';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { Title } from '@angular/platform-browser';
import { getLatestRoundIndex, hasPermission } from '../utils';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'tournament_matches_page',
  templateUrl: './tournament_matches_page.html',
  styleUrls: ['./tournament_matches_page.scss']
})
export class TournamentMatchesPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loadingTournament = true;
  loadingRound = false;
  sortedRounds: TournamentRound[] = [];
  selectedRoundIndex: number = 0;
  selectedRoundId: string = "";
  populatedTournamentRounds: Map<string, TournamentRound> = new Map(); // keyed by _id
  matches: TournamentMatch[] = [];
  sortedMatches: TournamentMatch[] = [];
  mobileMode = false;
  appUser?: AppUser;
  requestInProgress: boolean = false;

  sortMethodFormControl: FormControl;
  displayTimeFormControl: FormControl;

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private titleService: Title) {
      this.sortMethodFormControl = new FormControl("id");
      this.displayTimeFormControl = new FormControl("utc");
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
      const latestRoundIndex = getLatestRoundIndex(this.sortedRounds);
      this.switchSelectedRoundIndex(latestRoundIndex);
      this.titleService.setTitle(`${tournament.name} Matches`);
    });
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
    this.authService.appUser$.subscribe((user) => this.appUser = user);
  }

  get localUTC() {
    const timezone = this.appUser?.timezone ?? 0;
    return `UTC${timezone >= 0 ? "+" : ""}${timezone}`;
  }

  get timezone() {
    return this.displayTimeFormControl.value === "local" ? (this.appUser?.timezone ?? 0) : 0;
  }

  switchSelectedRoundIndex(index: number) {
    if (this.loadingRound) return;
    this.selectedRoundIndex = index;
    this.selectedRoundId = this.sortedRounds[index]?._id ?? "";
    if (this.selectedRoundId && !this.populatedTournamentRounds.has(this.selectedRoundId)) {
      this.loadingRound = true;
      this.tournamentsService.getTournamentRound(this.tournament!.acronym, this.selectedRoundId)
        .pipe(catchError((error) => {
          this.loadingRound = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((tourneyRound) => {
          this.loadingRound = false;
          this.populatedTournamentRounds.set(this.selectedRoundId!, tourneyRound);
          this.populateAppUsers();
          this.sortMatches();
        });
    } else {
      this.populateAppUsers();
      this.sortMatches();
    }
  }

  get selectedRound() {
    return this.sortedRounds[this.selectedRoundIndex];
  }

  get populatedTournamentRound() {
    return this.populatedTournamentRounds.get(this.selectedRoundId)!;
  }

  populateAppUsers() {
    const appUsers = new Map<number, AppUser>();
    for (let player of this.tournament!.players) {
      if (player.appUser) {
        appUsers.set(player.playerId, player.appUser);
      }
    }
    for (let staffMember of this.tournament!.staffMembers) {
      if (staffMember.appUser) {
        appUsers.set(staffMember.playerId, staffMember.appUser);
      }
    }
    this.matches = (this.populatedTournamentRound.matches || []).map((match) => {
      for (let participant of match.participants) {
        if ("username" in participant.playerOrTeam) {
          participant.playerOrTeam.appUser = appUsers.get(participant.playerOrTeam.playerId);
        } else {
          for (let player of participant.playerOrTeam.players) {
            player.appUser = appUsers.get(player.playerId);
          }
        }
      }
      for (let referee of match.referees) {
        referee.appUser = appUsers.get(referee.playerId);
      }
      for (let streamer of match.streamers) {
        streamer.appUser = appUsers.get(streamer.playerId);
      }
      for (let commentator of match.commentators) {
        commentator.appUser = appUsers.get(commentator.playerId);
      }
      return match;
    });
  }

  sortMatches() {
    if (this.sortMethodFormControl.value === "id") {
      this.sortedMatches = this.matches.sort((a, b) => {
        if (!Number.isNaN(parseInt(a.id)) && !Number.isNaN(parseInt(b.id))) {
          return parseInt(a.id) < parseInt(b.id) ? -1 : 1;
        } else {
          return a.id < b.id ? -1 : 1;
        }
      });
    } else if (this.sortMethodFormControl.value === "time") {
      this.sortedMatches = this.matches.sort((a, b) => a.time.getTime() < b.time.getTime() ? -1 : 1);
    }
  }

  get filteredMatches() {
    const matchesById: Map<string, TournamentMatch> = new Map();
    for (let match of this.sortedMatches) {
      matchesById.set(match.id, match);
    }
    // Set of match IDs that should be filtered out
    const filteredOut = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const match of this.sortedMatches) {
        if (filteredOut.has(match.id)) continue;
        let shouldFilter = false;
        for (const conditional of match.conditionals) {
          const conditionalMatch = matchesById.get(conditional.matchId);
          // filter this match if the conditional match is already filtered out
          if (filteredOut.has(conditional.matchId)) {
            shouldFilter = true;
            break;
          }
          // ignore if the match is not found
          if (!conditionalMatch) continue;
          // ignore if not scored yet
          if (conditionalMatch.participants.map((p) => p.score).every((score) => score === 0)) continue;
          const highestScore = Math.max(...conditionalMatch.participants.map((p) => p.score));
          const conditionalParticipant = conditionalMatch.participants.find((p) => {
            if ("username" in conditional.playerOrTeam) {
              return "username" in p.playerOrTeam && p.playerOrTeam.playerId === conditional.playerOrTeam.playerId;
            } else {
              return !("username" in p.playerOrTeam) && p.playerOrTeam._id === conditional.playerOrTeam._id;
            }
          });
          // ignore if participant not found
          if (!conditionalParticipant) continue;
          if (conditional.win && conditionalParticipant.score < highestScore) {
            shouldFilter = true;
            break;
          }
          if (!conditional.win && conditionalParticipant.score >= highestScore) {
            shouldFilter = true;
            break;
          }
        }
        if (shouldFilter) {
          filteredOut.add(match.id);
          changed = true;
        }
      }
    }
    return this.sortedMatches.filter((match) => !filteredOut.has(match.id));
  }

  getRoundlabels() {
    return this.sortedRounds.map(round => round.name) ?? [];
  }

  get isLobby() {
    return !this.populatedTournamentRound.matches.every((match) => match.type === 'versus') || false;
  }

  get participantType() {
    if (this.populatedTournamentRound.matches.every(match => match.isTeamMatch)) return "Team";
    if (this.populatedTournamentRound.matches.every(match => !match.isTeamMatch)) return "Player";
    return "Participant";
  }

  switchSortMethod(changeEvent: MatSelectChange) {
    this.sortMatches();
  }

  get playerTeam() {
    if (!this.tournament || !this.appUser) return undefined;
    return this.tournament.teams.find(team => team.players.some(player => player.playerId === this.appUser?.osuId));
  }

  get isRegisteredPlayer() {
    return !!this.tournament?.players.find(player => player.playerId === this.appUser?.osuId);
  }

  get isRegisteredToAnyMatch() {
    if (!this.tournament || !this.appUser) return false;
    return this.sortedMatches.some(
      match => match.participants.some(
        participant => ("username" in participant.playerOrTeam && participant.playerOrTeam.playerId === this.appUser?.osuId) ||
                       (!("username" in participant.playerOrTeam) && participant.playerOrTeam.players.some(player => player.playerId === this.appUser?.osuId))
      )
    );
  }

  signupStatus(match: TournamentMatch) {
    if (!match.enableSignups || !this.appUser || !this.isRegisteredPlayer) return "";
    if (match.time.getTime() < Date.now()) return "";
    if (match.isTeamMatch) {
      if (!this.playerTeam) return "";
      if (this.playerTeam.players[0]?.playerId !== this.appUser.osuId) return "";
      const isRegisteredToThisMatch = match.participants.some(participant => !("username" in participant.playerOrTeam) && participant.playerOrTeam._id === this.playerTeam!._id);
      if (isRegisteredToThisMatch) return "can_unregister";
      else {
        // limit to 1 signup per player per round on ui side for now, maybe add a way to set max signups later
        if (this.isRegisteredToAnyMatch) return "";
        if (match.type === "versus" && match.participants.length >= 2) return "";
        if (match.type === "lobby" && match.participants.length >= match.maxLobbyParticipants) return "";
        return "can_register";
      }
    } else {
      const isRegisteredToThisMatch = match.participants.some(participant => "username" in participant.playerOrTeam && participant.playerOrTeam.playerId === this.appUser?.osuId);
      if (isRegisteredToThisMatch) return "can_unregister";
      else {
        if (this.isRegisteredToAnyMatch) return "";
        if (match.type === "versus" && match.participants.length >= 2) return "";
        if (match.type === "lobby" && match.participants.length >= match.maxLobbyParticipants) return "";
        return "can_register";
      }
    }
  }

  toggleSignup(match: TournamentMatch) {
    const teamId = match.isTeamMatch ? this.playerTeam?._id : undefined;
    if (this.signupStatus(match) === "can_register") {
      this.requestInProgress = true;
      this.tournamentsService.registerMatch(this.tournament!.acronym, this.selectedRoundId, match._id, teamId)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully signed up to match", "", { duration: 10000 });
        });
    } else if (this.signupStatus(match) === "can_unregister") {
      this.requestInProgress = true;
      this.tournamentsService.unregisterMatch(this.tournament!.acronym, this.selectedRoundId, match._id, teamId)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully unregistered from match", "", { duration: 10000 });
        });
    }
  }

  get isTourneyConcluded(): boolean {
    return this.tournament?.progress === TournamentProgress.CONCLUDED;
  }

  get canRegisterReferee() {
    return !this.isTourneyConcluded && hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.REGISTER_REFEREE);
  }

  get canRegisterStreamer() {
    return !this.isTourneyConcluded && hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.REGISTER_STREAMER);
  }

  get canRegisterCommentator() {
    return !this.isTourneyConcluded && hasPermission(this.tournament!, this.appUser?.osuId, TournamentStaffPermission.REGISTER_COMMENTATOR);
  }

  refereeStatus(match: TournamentMatch) {
    if (!this.canRegisterReferee) return "";
    else {
      const isRegistered = match.referees.some(referee => referee.playerId === this.appUser?.osuId);
      return isRegistered ? "can_unregister" : "can_register";
    }
  }

  streamerStatus(match: TournamentMatch) {
    if (!this.canRegisterStreamer) return "";
    else {
      const isRegistered = match.streamers.some(streamer => streamer.playerId === this.appUser?.osuId);
      return isRegistered ? "can_unregister" : "can_register";
    }
  }

  commentatorStatus(match: TournamentMatch) {
    if (!this.canRegisterCommentator) return "";
    else {
      const isRegistered = match.commentators.some(commentator => commentator.playerId === this.appUser?.osuId);
      return isRegistered ? "can_unregister" : "can_register";
    }
  }

  toggleReferee(match: TournamentMatch) {
    if (this.refereeStatus(match) === "can_register") {
      this.requestInProgress = true;
      this.tournamentsService.registerReferee(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully registered as referee", "", { duration: 10000 });
        });
    } else if (this.refereeStatus(match) === "can_unregister") {
      this.requestInProgress = true;
      this.tournamentsService.unregisterReferee(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully unregistered as referee", "", { duration: 10000 });
        });
    }
  }

  toggleStreamer(match: TournamentMatch) {
    if (this.streamerStatus(match) === "can_register") {
      this.requestInProgress = true;
      this.tournamentsService.registerStreamer(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully registered as streamer", "", { duration: 10000 });
        });
    } else if (this.streamerStatus(match) === "can_unregister") {
      this.requestInProgress = true;
      this.tournamentsService.unregisterStreamer(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully unregistered as streamer", "", { duration: 10000 });
        });
    }
  }

  toggleCommentator(match: TournamentMatch) {
    if (this.commentatorStatus(match) === "can_register") {
      this.requestInProgress = true;
      this.tournamentsService.registerCommentator(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully registered as commentator", "", { duration: 10000 });
        });
    } else if (this.commentatorStatus(match) === "can_unregister") {
      this.requestInProgress = true;
      this.tournamentsService.unregisterCommentator(this.tournament!.acronym, this.selectedRoundId, match._id)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedMatch) => {
          this.requestInProgress = false;
          this.sortedMatches = this.sortedMatches.map((m) => m.id === updatedMatch.id ? updatedMatch : m);
          this.snackBar.open("Successfully unregistered as commentator", "", { duration: 10000 });
        });
    }
  }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ItemSelectorModule,
        MatFormFieldModule,
        MatSelectModule,
        TournamentMatchCardModule,
    ],
  declarations: [ TournamentMatchesPage ],
  exports: [ TournamentMatchesPage ],
  bootstrap: [ TournamentMatchesPage ]
})
export class TournamentMatchesPageModule {}
