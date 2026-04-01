import { CommonModule } from '@angular/common';
import { Component, inject, NgModule, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';
import { Observable, Subscription, of, throwError } from "rxjs";

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
//import { convertDatetimeLocalToDate } from './utils';
import { AppUser, GameMode, Mappool, MappoolSlot, Tournament, TournamentMatch, TournamentPlayer, TournamentRound, TournamentStaffMember, TournamentStaffRole, TournamentStaffPermission, TournamentTeam, TournamentProgress } from '../../models/models';
import { NavBarModule } from "../../nav_bar/nav_bar";
import { AuthService } from 'src/app/services/auth.service';
import { TournamentsService } from '../../services/tournaments.service';
import { Title } from '@angular/platform-browser';
import { getSortedMappool } from '../utils';

const EMPTY_MAPPOOL: Mappool = { _id: "", slots: [] };

@Component({
  selector: 'tournament-settings-page',
  templateUrl: './tournament_settings_page.html',
  styleUrls: ['./tournament_settings_page.scss']
})
export class TournamentSettingsPage implements OnInit {
  acronym = "";
  tournament?: Tournament;
  loading = true;
  appUser?: AppUser;
  requestInProgress = false;
  isLoadingTourneyRound = false;
  tournamentRounds: Map<string, TournamentRound> = new Map(); // keyed by _id
  players: TournamentPlayer[] = [];
  selectedPlayer?: TournamentPlayer;
  selectedPlayerIndex = -1;
  teams: TournamentTeam[] = [];
  selectedTeam?: TournamentTeam;
  selectedTeamIndex = -1;
  staffMembers: TournamentStaffMember[] = [];
  selectedStaffMember?: TournamentStaffMember;
  selectedStaffMemberIndex = -1;
  staffRoles: TournamentStaffRole[] = [];
  selectedStaffRole?: TournamentStaffRole;
  selectedStaffRoleIndex = -1;
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

  submitMatchForm: FormGroup;
  matchIdFormControl: FormControl;

  TournamentStaffPermission = TournamentStaffPermission;

  readonly dialogService = inject(MatDialog);

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private titleService: Title) {
      this.selectedPlayerFormControl = new FormControl("-1");
      this.playerEditorForm = new FormGroup({
        selectedPlayer: this.selectedPlayerFormControl,
      });

      this.matchIdFormControl = new FormControl("", [Validators.required, Validators.min(1)]);
      this.submitMatchForm = new FormGroup({
        matchId: this.matchIdFormControl,
      });
    }

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
      this.refreshTournamentHelper(tournament);
      this.titleService.setTitle(`${tournament.name} Settings`);
    });

    this.authService.appUser$.subscribe((user) => this.appUser = user);
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
    this.requestInProgress = true;
    this.tournamentsService.editTournament(partialTournament)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        }))
        .subscribe((updatedTournament) => {
          this.tournament = updatedTournament;
          this.requestInProgress = false;
          this.snackBar.open("Successfully edited settings.", "", { duration: 10000 });
        });
  }

  /*
  addPlayer() {
    this.requestInProgress = true;
    const formData = this.addPlayerForm?.getRawValue();
    if (formData && this.tournament) {
      this.tournamentsService.addTournamentPlayer(this.tournament?.acronym, formData.playerId)
        .pipe(catchError((error) => {
          this.requestInProgress = false;
          this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
          return throwError(error);
        })).subscribe((player) => {
          this.tournament?.players.push(player);
          this.requestInProgress = false;
          this.snackBar.open("Successfully added player to tournament.", "", { duration: 10000 });
        });
    }
  }
  */

  refreshPlayers() {
    const dialogRef = this.dialogService.open(RefreshPlayersDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requestInProgress = true;
        this.tournamentsService.refreshPlayers(this.acronym)
          .pipe(catchError((error) => {
            this.requestInProgress = false;
            this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
            return throwError(error);
          })).subscribe((result: any) => {
            this.requestInProgress = false;
            if (result.statusCode === 207 && result.message) {
              this.snackBar.open("Players refreshed. " + result.message, "", { duration: 20000 });
            } else {
              this.snackBar.open("Players refreshed.", "", { duration: 10000 });
            }
          });
      }
    });
  }

  refreshTournament(): Subscription {
    this.requestInProgress = true;
    return this.tournamentsService.getTournament(this.acronym)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((tourney) => {
        this.tournament = tourney;
        this.requestInProgress = false;
        this.refreshTournamentHelper(tourney);
      });
  }

  refreshTournamentHelper(tourney: Tournament) {
    this.players = [...tourney.players].sort((a, b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    this.teams = [...tourney.teams].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    this.staffMembers = [...tourney.staffMembers].sort((a, b) => a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1);
    this.staffRoles = [...tourney.staffRoles].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    this.rounds = [...tourney.rounds].sort((a, b) => a.startDate.getTime() < b.startDate.getTime() ? -1 : 1);
  }

  refreshRound(roundId: string): Subscription {
    this.requestInProgress = true;
    this.isLoadingTourneyRound = true;
    return this.tournamentsService.getTournamentRound(this.tournament!.acronym, roundId).pipe(
      switchMap((tourneyRound) => {
        // fetch mappool if it's wip but user has permission to view wip pool
        let theMappool = tourneyRound.mappool;
        if (typeof theMappool === "string") {
          if (this.hasPermission(TournamentStaffPermission.VIEW_WIP_MAPPOOLS)) {
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
        this.requestInProgress = false;
        this.isLoadingTourneyRound = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe(({ tourneyRound, mappool }) => {
        if (mappool) tourneyRound.mappool = mappool;
        this.requestInProgress = false;
        this.isLoadingTourneyRound = false;
        this.tournamentRounds.set(roundId, tourneyRound);
        this.selectedRound = this.tournamentRounds.get(roundId);
        this.switchRoundHelper();
      });
  }

  get playerLabels() {
    return this.players.map((player) => player.username);
  }

  switchSelectedPlayer(playerId: number) {
    const index = this.players.findIndex((player) => player.playerId === playerId);
    this.selectedPlayerIndex = index;
    if (index < 0) this.selectedPlayer = undefined;
    this.selectedPlayer = this.players[index];
  }

  submitUpdatePlayerForm(partialPlayer: Partial<TournamentPlayer>) {
    if (!partialPlayer.playerId) return;
    this.requestInProgress = true;

    let request: Observable<TournamentPlayer>;
    let successMessage = "";
    if (!this.selectedPlayer) {
      request = this.tournamentsService.addTournamentPlayer(this.acronym, partialPlayer.playerId, partialPlayer);
      successMessage = "Successfully added tournament player.";
    } else {
      request = this.tournamentsService.editTournamentPlayer(this.acronym, this.selectedPlayer.playerId, partialPlayer);
      successMessage = "Successfully edited tournament player.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentPlayer) => {
      this.refreshTournament().add(() => {
        this.requestInProgress = false;
        this.selectedPlayer = this.players[this.selectedPlayerIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removePlayer(player: TournamentPlayer) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentPlayer(this.acronym, player.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.players.findIndex((player2) => player2.playerId === player.playerId);
        if (index !== undefined) this.players.splice(index, 1);
        this.switchSelectedPlayer(-1);
        this.snackBar.open("Successfully removed tournament player.", "", { duration: 10000 });
      });
  }

  get teamLabels() {
    return this.teams.map((team) => team.name);
  }
  
  switchSelectedTeam(index: number) {
    this.selectedTeamIndex = index;
    if (index < 0) this.selectedTeam = undefined;
    this.selectedTeam = this.teams[index];
  }

  submitUpdateTeamForm(partialTeam: Partial<TournamentTeam>) {
    if (!partialTeam.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentTeam>;
    let successMessage = "";
    if (!this.selectedTeam) {
      request = this.tournamentsService.addTournamentTeam(this.acronym, partialTeam);
      successMessage = "Successfully added tournament team.";
    } else {
      request = this.tournamentsService.editTournamentTeam(this.acronym, this.selectedTeam._id, partialTeam);
      successMessage = "Successfully edited tournament team.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentTeam) => {
      this.refreshTournament().add(() => {
        this.requestInProgress = false;
        this.selectedTeam = this.teams[this.selectedTeamIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removeTeam(team: TournamentTeam) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentTeam(this.acronym, team._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.teams.findIndex((team2) => team2._id === team._id);
        if (index !== undefined) this.teams.splice(index, 1);
        this.switchSelectedTeam(-1);
        this.snackBar.open("Successfully removed tournament team.", "", { duration: 10000 });
      });
  }

  uploadTeamImage(event: any) {
    this.requestInProgress = true;
    const teamId = this.selectedTeam!._id;
    this.tournamentsService.uploadTeamImage(this.tournament!.acronym, teamId, event)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedTeam) => {
        this.refreshTournament().add(() => {
          this.requestInProgress = false;
          this.selectedTeam = this.teams[this.selectedTeamIndex];
          this.snackBar.open("Successfully updated team image", "", { duration: 10000 });
        });
      });
  }

  uploadTourneyBanner(event: any) {
    this.requestInProgress = true;
    this.tournamentsService.uploadTourneyBanner(this.tournament!.acronym, event)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedTeam) => {
        this.refreshTournament().add(() => {
          this.requestInProgress = false;
          this.snackBar.open("Successfully updated tournament banner", "", { duration: 10000 });
        });
      });
  }

  uploadCategoryIcon(event: any) {
    this.requestInProgress = true;
    this.tournamentsService.uploadTourneyCategoryIcon(this.tournament!.acronym, event.name, event.file)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      }))
      .subscribe((updatedTourney) => {
        this.refreshTournament().add(() => {
          this.requestInProgress = false;
          this.snackBar.open("Successfully updated tournament category icon", "", { duration: 10000 });
        });
      });
  }

  get staffMemberLabels() {
    return this.staffMembers.map((member) => member.username) ?? [];
  }

  switchSelectedStaffMember(index: number) {
    this.selectedStaffMemberIndex = index;
    if (index < 0) this.selectedStaffMember = undefined;
    else this.selectedStaffMember = this.staffMembers[index];
  }

  submitUpdateStaffMemberForm(formData: any) {
    if (!formData.playerId) return;
    this.requestInProgress = true;

    let request: Observable<TournamentStaffMember>;
    let successMessage = "";
    if (!this.selectedStaffMember) {
      request = this.tournamentsService.addTournamentStaffMember(this.acronym, formData.playerId, formData.roles);
      successMessage = "Successfully added staff member.";
    } else {
      request = this.tournamentsService.editTournamentStaffMember(this.acronym, formData.playerId, formData.roles);
      successMessage = "Successfully edited staff member.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedStaffMember) => {
      this.refreshTournament().add(() => {
        this.requestInProgress = false;
        this.selectedStaffMember = this.staffMembers[this.selectedStaffMemberIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removeStaffMember(staffMember: TournamentStaffMember) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentStaffMember(this.acronym, staffMember.playerId)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.staffMembers.findIndex((member) => member.playerId === staffMember.playerId);
        if (index !== undefined) this.staffMembers.splice(index, 1);
        this.switchSelectedStaffMember(-1);
        this.snackBar.open("Successfully removed staff member.", "", { duration: 10000 });
      });
  }

  get staffRoleLabels() {
    return this.staffRoles.map((role) => role.name);
  }

  switchSelectedStaffRole(index: number) {
    this.selectedStaffRoleIndex = index;
    if (index < 0) this.selectedStaffRole = undefined;
    else this.selectedStaffRole = this.staffRoles[index];
  }

  submitUpdateStaffRoleForm(formData: any) {
    if (!formData.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentStaffRole>;
    let successMessage = "";
    if (!this.selectedStaffRole) {
      request = this.tournamentsService.addTournamentStaffRole(this.acronym, formData.name, formData.permissions);
      successMessage = "Successfully added staff role.";
    } else {
      request = this.tournamentsService.editTournamentStaffRole(
        this.acronym, this.selectedStaffRole._id, formData.name, formData.permissions);
      successMessage = "Successfully edited staff role.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedStaffRole) => {
      this.refreshTournament().add(() => {
        this.requestInProgress = false;
        this.selectedStaffRoleIndex = this.staffRoles.findIndex((role) => role._id === updatedStaffRole._id);
        this.selectedStaffRole = this.staffRoles[this.selectedStaffRoleIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removeStaffRole(staffRole: TournamentStaffRole) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentStaffRole(this.acronym, staffRole._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.staffRoles.findIndex((role) => role._id === staffRole._id);
        if (index !== undefined) this.staffRoles.splice(index, 1);
        this.switchSelectedStaffRole(-1);
        this.snackBar.open("Successfully removed staff role.", "", { duration: 10000 });
      });
  }

  get roundLabels() {
    return this.rounds.map(round => round.name);
  }

  switchSelectedTournamentRound(index: number) {
    if (this.isLoadingTourneyRound) return;
    this.selectedRoundIndex = index;
    if (index < 0) this.selectedRound = undefined;
    else {
      const roundId = this.rounds[index]._id;
      if (!this.tournamentRounds.has(roundId)) {
        this.refreshRound(roundId).add(() => {
          this.selectedRound = this.tournamentRounds.get(roundId);
          this.switchRoundHelper();
        });
      } else {
        this.selectedRound = this.tournamentRounds.get(roundId);
        this.switchRoundHelper();
      }
    }
  }
  
  switchRoundHelper() {
    this.slots = getSortedMappool(this.tournament!, this.selectedRound!.mappool);
    this.matches = [...this.selectedRound!.matches].sort((a, b) => {
      if (!Number.isNaN(parseInt(a.id)) && !Number.isNaN(parseInt(b.id))) {
        return parseInt(a.id) < parseInt(b.id) ? -1 : 1;
      } else {
        return a.id < b.id ? -1 : 1;
      }
    });
  }

  submitUpdateRoundForm(partialRound: Partial<TournamentRound>) {
    if (!partialRound.name) return;
    this.requestInProgress = true;

    let request: Observable<TournamentRound>;
    let successMessage = "";
    if (!this.selectedRound) {
      request = this.tournamentsService.createTournamentRound(
        this.acronym, partialRound);
      successMessage = "Successfully created tournament round.";
    } else {
      request = this.tournamentsService.editTournamentRound(
        this.acronym, this.selectedRound._id, partialRound);
      successMessage = "Successfully edited tournament round.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentRound) => {
      this.refreshTournament().add(() => {
        this.refreshRound(updatedTournamentRound._id).add(() => {
          this.requestInProgress = false;
          this.selectedRoundIndex = this.rounds.findIndex((round) => round._id === updatedTournamentRound._id);
          this.snackBar.open(successMessage, "", { duration: 10000 });
        });
      });
    });
  }

  removeRound(round: TournamentRound) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentRound(this.acronym, round._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.rounds.findIndex((r) => r._id === round._id);
        if (index !== undefined) this.rounds.splice(index, 1);
        this.switchSelectedTournamentRound(-1);
        this.snackBar.open("Successfully removed tournament round.", "", { duration: 10000 });
      });
  }

  get slotLabels() {
    return this.slots.map((slot) => slot.label) || [];
  }

  switchSelectedTournamentSlot(index: number) {
    this.selectedSlotIndex = index;
    if (index < 0) this.selectedSlot = undefined;
    this.selectedSlot = this.slots[index];
  }

  submitUpdateSlotForm(formData: any) {
    if (!formData.label) return;
    this.requestInProgress = true;

    let request: Observable<MappoolSlot>;
    let successMessage = "";
    if (!this.selectedSlot) {
      request = this.tournamentsService.addTournamentSlot(this.acronym, this.selectedRound!._id, formData.beatmapId, formData);
      successMessage = "Successfully added tournament slot.";
    } else {
      request = this.tournamentsService.editTournamentSlot(this.acronym, this.selectedRound!._id, this.selectedSlot._id, formData.beatmapId, formData);
      successMessage = "Successfully edited tournament slot.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentSlot) => {
      this.refreshRound(this.selectedRound!._id).add(() => {
        this.requestInProgress = false;
        const maybeANewIndex = this.slots.findIndex((slot) => slot._id === updatedTournamentSlot._id);
        this.selectedSlot = this.slots[maybeANewIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removeSlot(slot: MappoolSlot) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentSlot(this.acronym, this.selectedRound!._id, slot._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.slots.findIndex((s) => s._id === slot._id);
        if (index !== undefined) this.slots.splice(index, 1);
        this.switchSelectedTournamentSlot(-1);
        this.snackBar.open("Successfully removed tournament slot.", "", { duration: 10000 });
      });
  }

  /*
  switchSelectedTournamentLobby(index: number) {
    this.selectedLobbyIndex = index;
    if (index < 0) this.selectedLobby = undefined;
    this.selectedLobby = this.selectedRound!.lobbies[index];
  }

  submitUpdateLobbyForm(formData: any) {
    if (!formData.id) return;
    this.requestInProgress = true;

    let request: Observable<TournamentLobby>;
    let successMessage = "";
    if (!this.selectedLobby) {
      request = this.tournamentsService.addTournamentLobby(
        this.acronym, this.selectedRound!._id, formData.id, formData.time, formData.players, [], formData.matchIds);
      successMessage = "Successfully added tournament lobby.";
    } else {
      request = this.tournamentsService.editTournamentLobby(
        this.acronym, this.selectedRound!._id, this.selectedLobby._id, formData.id, formData.time, formData.players, [], formData.matchIds);
      successMessage = "Successfully edited tournament lobby.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentLobby) => {
      this.refreshRound(this.selectedRound!._id).add(() => {
        this.requestInProgress = false;
        this.selectedLobby = this.selectedRound!.lobbies[this.selectedLobbyIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }
  */

  get matchLabels() {
    return this.matches.map((match) => match.id);
  }

  switchSelectedTournamentMatch(index: number) {
    this.selectedMatchIndex = index;
    if (index < 0) this.selectedMatch = undefined;
    this.selectedMatch = this.matches[index];
  }

  submitUpdateMatchForm(partialMatch: Partial<TournamentMatch>) {
    if (!partialMatch.id) return;
    this.requestInProgress = true;

    let request: Observable<TournamentMatch>;
    let successMessage = "";

    if (!this.selectedMatch) {
      request = this.tournamentsService.addTournamentMatch(this.acronym, this.selectedRound!._id, partialMatch);
      successMessage = "Successfully added tournament match.";
    } else {
      request = this.tournamentsService.editTournamentMatch(this.acronym, this.selectedRound!._id, this.selectedMatch._id, partialMatch);
      successMessage = "Successfully edited tournament match.";
    }

    request.pipe(catchError((error) => {
      this.requestInProgress = false;
      this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
      return throwError(error);
    })).subscribe((updatedTournamentMatch) => {
      this.refreshRound(this.selectedRound!._id).add(() => {
        this.requestInProgress = false;
        this.selectedMatchIndex = this.matches.findIndex((match) => match._id === updatedTournamentMatch._id);
        this.selectedMatch = this.matches[this.selectedMatchIndex];
        this.snackBar.open(successMessage, "", { duration: 10000 });
      });
    });
  }

  removeMatch(match: TournamentMatch) {
    this.requestInProgress = true;
    this.tournamentsService.removeTournamentMatch(this.acronym, this.selectedRound!._id, match._id)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe(() => {
        this.requestInProgress = false;
        const index = this.matches.findIndex((match2) => match2._id === match._id);
        if (index !== undefined) this.matches.splice(index, 1);
        this.switchSelectedTournamentMatch(-1);
        this.snackBar.open("Successfully removed tournament match.", "", { duration: 10000 });
      });
  }

  submitMatch(formData: any) {
    if (!formData.id) return;
    this.requestInProgress = true;
    this.tournamentsService.submitMatch(this.acronym, this.selectedRound!._id, formData)
      .pipe(catchError((error) => {
        this.requestInProgress = false;
        this.snackBar.open(`Request failed: ${error.error.message}`, "", { duration: 10000 });
        return throwError(error);
      })).subscribe((updatedTournamentMatch) => {
        this.requestInProgress = false;
        this.snackBar.open("Successfully submitted match to round.", "", { duration: 10000 });
        const index = this.matches.findIndex((match) => match._id === updatedTournamentMatch._id);
        if (index >= 0) {
          this.matches.splice(index, 1, updatedTournamentMatch);
          this.matches = [...this.matches];
        }
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
  selector: 'refresh-players-dialog',
  template: `<h2 mat-dialog-title>Refresh players</h2>
             <mat-dialog-content class="mat-typography">
               Refresh the usernames, countries, and ranks of all registered players?
             </mat-dialog-content>
             <mat-dialog-actions align="end" style="margin: 0 16px 12px;">
               <button mat-raised-button color="secondary" [mat-dialog-close]="false">No</button>
               <button mat-raised-button color="primary" [mat-dialog-close]="true">Yes</button>
             </mat-dialog-actions>`,
})
export class RefreshPlayersDialog {}

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
  ],
  declarations: [ TournamentSettingsPage, RefreshPlayersDialog ],
  exports: [ TournamentSettingsPage ],
  bootstrap: [ TournamentSettingsPage ]
})
export class TournamentSettingsPageModule {}
