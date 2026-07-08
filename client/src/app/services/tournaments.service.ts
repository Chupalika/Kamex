import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, BehaviorSubject, map, catchError, throwError, Subject, switchMap, of, distinctUntilChanged, finalize, tap } from 'rxjs';

import { BatchAssignPlayerSeedsDto, BatchAssignTeamSeedsDto, Mappool, MappoolSlot, Score, Scoresheet, SubmitMatchDto, Tournament, TournamentMatch, TournamentPlayer, TournamentRound, TournamentStaffMember, TournamentStaffPermission, TournamentStaffRole, TournamentTeam } from '../models/models';
import { environment } from 'src/environments/environment';
import { hasPermission, processApiResponse } from 'src/app/tournament/utils';
import { AuthService } from './auth.service';

const REFRESH_TIME_MINUTES = 15;

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly apiUrl = environment.apiUrl + '/api/tournament';
  private readonly loadedTournamentRounds: Map<string, TournamentRound> = new Map();
  private currentTournamentUpdateTimestamp: Date = new Date();
  private roundUpdateTimestamps: Map<string, Date> = new Map();

  private readonly notifications: Subject<string> = new Subject<string>();
  private readonly loadingTournament: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly currentTournament: BehaviorSubject<Tournament|undefined> = new BehaviorSubject<Tournament|undefined>(undefined);
  private readonly loadingRound: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly currentRound: BehaviorSubject<TournamentRound|undefined> = new BehaviorSubject<TournamentRound|undefined>(undefined);
  private readonly activeRequests: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  notifications$ = this.notifications.asObservable();
  loadingTournament$ = this.loadingTournament.asObservable();
  currentTournament$ = this.currentTournament.asObservable();
  loadingRound$ = this.loadingRound.asObservable();
  currentRound$ = this.currentRound.asObservable();
  requestInProgress$ = this.activeRequests.pipe(map(count => count > 0), distinctUntilChanged());

  constructor(private http: HttpClient, private authService: AuthService, private translocoService: TranslocoService) {}

  loadOrRefreshTournament(acronym: string, hardRefresh: boolean = false, alsoRefreshRound: boolean = false) {
    if (this.loadingTournament.value) return;

    const shouldRefresh = hardRefresh || Date.now() - this.currentTournamentUpdateTimestamp.getTime() > REFRESH_TIME_MINUTES * 60 * 1000;
    if (!shouldRefresh && this.currentTournament.value?.acronym === acronym) return;

    this.loadingTournament.next(true);
    return this.getTournament(acronym).pipe(
      catchError((error) => {
        return throwError(error);
      }),
      finalize(() => this.loadingTournament.next(false)),
    ).subscribe((tourney) => {
      this.refreshCurrentTourneyState(tourney, true);
      if (alsoRefreshRound && this.currentRound.value) {
        this.loadOrRefreshTournamentRound(this.currentRound.value._id, hardRefresh, !this.currentRound.value.mappool.unloaded, !this.currentRound.value.scoresheet.unloaded);
      }
    });
  }

  clearCurrentTournament() {
    this.currentTournament.next(undefined);
    this.currentRound.next(undefined);
    this.loadedTournamentRounds.clear();
    this.roundUpdateTimestamps.clear();
  }

  refreshCurrentTourneyState(tourney: Tournament, fresh: boolean = false): Tournament {
    this.currentTournament.next(tourney);
    if (fresh) this.currentTournamentUpdateTimestamp = new Date();
    return tourney;
  }

  loadOrRefreshTournamentRound(roundId: string, hardRefresh: boolean = false, loadMappool: boolean = false, loadScoresheet: boolean = false) {
    if (!this.currentTournament.value || this.loadingRound.value) return;

    const loadedRound = this.loadedTournamentRounds.get(roundId);
    if (loadedRound) if (this.currentRound.value?._id !== roundId) this.currentRound.next(loadedRound);

    // checking beforehand whether we need to do any fetching
    const shouldRefreshRound = hardRefresh || !loadedRound || !this.roundUpdateTimestamps.has(roundId) || Date.now() - this.roundUpdateTimestamps.get(roundId)!.getTime() > REFRESH_TIME_MINUTES * 60 * 1000;
    const roundMappool = loadedRound?.mappool;
    const mappoolUnloaded = !roundMappool || (typeof roundMappool === "string") || roundMappool.unloaded;
    const roundScoresheet = loadedRound?.scoresheet;
    const scoresheetUnloaded = !roundScoresheet || (typeof roundScoresheet === "string") || roundScoresheet.unloaded;

    // fetch mappool if it's wip but user has permission to view wip pool
    const shouldLoadMappool = loadMappool && mappoolUnloaded && this.canViewWipMappool;
    // fetch scoresheet if it's wip but user has permission to view wip scoresheet
    const shouldLoadScoresheet = loadScoresheet && scoresheetUnloaded && this.canViewWipScoresheet;

    if (!shouldRefreshRound && !shouldLoadMappool && !shouldLoadScoresheet) return;

    this.loadingRound.next(true);
    return (shouldRefreshRound ? this.getTournamentRound(roundId) : of(loadedRound)).pipe(
      switchMap((round) => {
        let theMappool = round.mappool;
        // Since round may be freshly updated with unloaded mappool, need to re-evaluate whether to fetch it
        if ((typeof theMappool === "string") || theMappool.unloaded) {
          const mappoolId = (typeof theMappool === "string") ? theMappool : theMappool._id;
          if (loadMappool && this.canViewWipMappool) {
            return this.getTournamentMappool(mappoolId).pipe(map((mappool) => ({ round, mappool })));
          } else {
            return of({ round, mappool: { _id: mappoolId, slots: [], unloaded: true } });
          }
        } else {
          return of({ round, mappool: theMappool });
        }
      }),
      switchMap(({ round, mappool }) => {
        let theScoresheet = round.scoresheet;
        // Since round may be freshly updated with unloaded scoresheet, need to re-evaluate whether to fetch it
        if ((typeof theScoresheet === "string") || theScoresheet.unloaded) {
          const scoresheetId = (typeof theScoresheet === "string") ? theScoresheet : theScoresheet._id;
          if (loadScoresheet && this.canViewWipScoresheet) {
            return this.getTournamentScoresheet(scoresheetId).pipe(map((scoresheet) => ({ round, mappool, scoresheet })));
          } else {
            return of({ round, mappool, scoresheet: { _id: scoresheetId, isPublic: false, ownerId: 0, admins: [], mappool: mappool, slotScoresheets: [], unloaded: true } });
          }
        } else {
          return of({ round, mappool, scoresheet: theScoresheet });
        }
      }),
      catchError((error) => {
        return throwError(error);
      }),
      finalize(() => this.loadingRound.next(false)),
    ).subscribe(({ round, mappool, scoresheet }) => {
      round.mappool = mappool;
      round.scoresheet = scoresheet;
      this.refreshRoundState(round, shouldRefreshRound);
    });
  }

  unselectCurrentRound() {
    this.currentRound.next(undefined);
  }

  refreshRoundState(round: TournamentRound, fresh: boolean = false, switchCurrent: boolean = true): TournamentRound {
    if (switchCurrent) this.currentRound.next(round);
    this.loadedTournamentRounds.set(round._id, round);
    if (fresh) this.roundUpdateTimestamps.set(round._id, new Date());
    const isNew = this.currentTournament.value!.rounds.findIndex((r) => r._id === round._id) < 0;
    this.refreshCurrentTourneyState({
      ...this.currentTournament.value!,
      rounds: isNew ? [...this.currentTournament.value!.rounds, round] : [...this.currentTournament.value!.rounds].map((r) => r._id === round._id ? round : r),
    });
    return round;
  }

  markRoundForRefresh(roundId: string) {
    this.roundUpdateTimestamps.set(roundId, new Date(0));
  }

  getCurrentTourneyLastUpdated(): Date {
    return new Date(this.currentTournamentUpdateTimestamp);
  }

  getCurrentRoundLastUpdated(): Date|undefined {
    return this.currentRound.value && this.roundUpdateTimestamps.has(this.currentRound.value._id) ? new Date(this.roundUpdateTimestamps.get(this.currentRound.value._id)!) : undefined;
  }

  get canViewWipMappool() {
    if (!this.currentTournament.value) return false;
    return hasPermission(this.currentTournament.value, this.authService.getCurrentUser()?.osuId, TournamentStaffPermission.VIEW_WIP_MAPPOOLS);
  }

  get canViewWipScoresheet() {
    if (!this.currentTournament.value) return false;
    return hasPermission(this.currentTournament.value, this.authService.getCurrentUser()?.osuId, TournamentStaffPermission.VIEW_WIP_SCORESHEETS);
  }

  notifyError(error: any) {
    this.notifications.next(this.translocoService.translate("common.requestFailed", { error: error.error.message || error.error || error.message }));
    return throwError(() => error);
  }

  addRequest() {
    this.activeRequests.next(this.activeRequests.value + 1);
  }

  subtractRequest() {
    this.activeRequests.next(this.activeRequests.value - 1);
  }

  /* API METHODS */
  /* Most of these methods will assume that it's dealing with the current tournament/round. */
  getTournaments(): Observable<Tournament[]> {
    return this.http.get(`${this.apiUrl}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data: any) => { return data.map((x: any) => processApiResponse(x)) as Tournament[]; }),
    );
  }

  // note: does not change state, use loadOrRefreshTournament() for that purpose
  getTournament(acronym: string): Observable<Tournament> {
    return this.http.get(`${this.apiUrl}/${acronym}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Tournament; }),
    );
  }

  // admin method, no need to adjust state
  createTournament(partialTournament: Partial<Tournament>): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}`, partialTournament, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Tournament; }),
    );
  }

  editTournament(partialTournament: Partial<Tournament>): Observable<Tournament> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}`, partialTournament, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  uploadTourneyBanner(file: File): Observable<Tournament> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/banner`, formData, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  uploadTourneyIcon(file: File): Observable<Tournament> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/icon`, formData, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  uploadTourneyCategoryIcon(categoryName: string, file: File): Observable<Tournament> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/categoryIcon/${categoryName}`, formData, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  createTournamentRound(partialRound: Partial<TournamentRound>): Observable<TournamentRound> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round`, partialRound, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const round = processApiResponse(data) as TournamentRound;
        return this.refreshRoundState(round, true, false);
      }),
    );
  }

  // note: does not change state, use loadOrRefreshTournamentRound() for that purpose
  getTournamentRound(roundId: string): Observable<TournamentRound> {
    return this.http.get(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${roundId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as TournamentRound; }),
    );
  }

  editTournamentRound(partialRound: Partial<TournamentRound>): Observable<TournamentRound> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}`, partialRound, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const round = processApiResponse(data) as TournamentRound;
        return this.refreshRoundState(round, true);
      }),
    );
  }

  removeTournamentRound(): Observable<boolean> {
    const roundId = this.currentRound.value!._id;
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${roundId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.currentRound.next(undefined);
        this.loadedTournamentRounds.delete(roundId);
        this.roundUpdateTimestamps.delete(roundId);
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          rounds: [...this.currentTournament.value!.rounds].filter((r) => r._id !== roundId),
        });
        return true;
      }),
    );
  }

  getTournamentMappool(mappoolId: string): Observable<Mappool> {
    return this.http.get(`${this.apiUrl}/${this.currentTournament.value!.acronym}/mappool/${mappoolId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Mappool; }),
    );
  }

  getTournamentScoresheet(scoresheetId: string): Observable<Scoresheet> {
    return this.http.get(`${this.apiUrl}/${this.currentTournament.value!.acronym}/scoresheet/${scoresheetId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Scoresheet; }),
    );
  }

  register(): Observable<TournamentPlayer> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/register`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const player = processApiResponse(data) as TournamentPlayer;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players, player],
        });
        return player;
      }),
    );
  }

  unregister(): Observable<boolean> {
    const playerId = this.authService.getCurrentUser()?.osuId;
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/unregister`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players].filter((p) => p.playerId !== playerId),
        });
        return true;
      }),
    );
  }

  addTournamentPlayer(playerId: number, partialPlayer: Partial<TournamentPlayer>): Observable<TournamentPlayer> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/player/${playerId}`, partialPlayer, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const player = processApiResponse(data) as TournamentPlayer;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players, player],
        });
        return player;
      }),
    );
  }

  editTournamentPlayer(playerId: number, partialPlayer: Partial<TournamentPlayer>): Observable<TournamentPlayer> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/player/${playerId}`, partialPlayer, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const player = processApiResponse(data) as TournamentPlayer;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players].map((p) => p._id === player._id ? player : p),
        });
        return player;
      }),
    );
  }

  removeTournamentPlayer(playerId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/player/${playerId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players].filter((p) => p.playerId !== playerId),
        });
        return true;
      }),
    );
  }

  refreshPlayers(acronym: string): Observable<boolean> {
    return this.http.post(`${this.apiUrl}/${acronym}/refreshPlayers`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => { return true; }),
    );
  }

  refreshPlayer(acronym: string, playerId: number): Observable<TournamentPlayer> {
    return this.http.post(`${this.apiUrl}/${acronym}/refreshPlayer/${playerId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const player = processApiResponse(data) as TournamentPlayer;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          players: [...this.currentTournament.value!.players].map((p) => p._id === player._id ? player : p),
        });
        return player;
      }),
    );
  }

  createTournamentTeam(partialTeam: Partial<TournamentTeam>): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/createTeam`, partialTeam, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams, team],
        });
        return team;
      }),
    );
  }

  leaveTournamentTeam(teamId: string): Observable<TournamentTeam|undefined> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/leaveTeam/${teamId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam|undefined;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: team ? [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t) : [...this.currentTournament.value!.teams].filter((t) => t._id !== teamId),
        });
        return team;
      }),
    );
  }

  addTournamentTeam(partialTeam: Partial<TournamentTeam>): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/team`, partialTeam, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams, team],
        });
        return team;
      }),
    );
  }

  editTournamentTeam(teamId: string, partialTeam: Partial<TournamentTeam>): Observable<TournamentTeam> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/team/${teamId}`, partialTeam, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  removeTournamentTeam(teamId: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/team/${teamId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].filter((t) => t._id !== teamId),
        });
        return true;
      }),
    );
  }

  requestToJoinTeam(teamId: string): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/requestTeam/${teamId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  retractTeamJoinRequest(teamId: string): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/unrequestTeam/${teamId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  acceptTeamJoinRequest(teamId: string, playerId: number): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/acceptTeamRequest/${teamId}/${playerId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  denyTeamJoinRequest(teamId: string, playerId: number): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/denyTeamRequest/${teamId}/${playerId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  removeTeamMember(teamId: string, playerId: number): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/removeTeamMember/${teamId}/${playerId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  transferCaptain(teamId: string, playerId: number): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/transferCaptain/${teamId}/${playerId}`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  updateTeamName(teamId: string, newName: string): Observable<TournamentTeam> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/teamName/${teamId}`, { name: newName }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  uploadTeamImage(teamId: string, file: File): Observable<TournamentTeam> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/teamImage/${teamId}`, formData, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const team = processApiResponse(data) as TournamentTeam;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          teams: [...this.currentTournament.value!.teams].map((t) => t._id === team._id ? team : t),
        });
        return team;
      }),
    );
  }

  batchAssignPlayerSeeds(dto: BatchAssignPlayerSeedsDto): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/batchAssignPlayerSeeds`, dto, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  batchAssignTeamSeeds(dto: BatchAssignTeamSeedsDto): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/batchAssignTeamSeeds`, dto, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        return this.refreshCurrentTourneyState(tourney);
      }),
    );
  }

  addTournamentStaffMember(playerId: number, roles: TournamentStaffRole[]): Observable<TournamentStaffMember> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffMember/${playerId}`, { roles }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const staffMember = processApiResponse(data) as TournamentStaffMember;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffMembers: [...this.currentTournament.value!.staffMembers, staffMember],
        });
        return staffMember;
      }),
    );
  }

  editTournamentStaffMember(playerId: number, roles: TournamentStaffRole[]): Observable<TournamentStaffMember> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffMember/${playerId}`, { roles }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const staffMember = processApiResponse(data) as TournamentStaffMember;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffMembers: [...this.currentTournament.value!.staffMembers].map((m) => m.playerId === staffMember.playerId ? staffMember : m),
        });
        return staffMember;
      }),
    );
  }

  removeTournamentStaffMember(playerId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffMember/${playerId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffMembers: [...this.currentTournament.value!.staffMembers].filter((m) => m.playerId !== playerId),
        });
        return true;
      }),
    );
  }

  addTournamentStaffRole(name: string, permissions: string[]): Observable<TournamentStaffRole> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffRole`, { name, permissions }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const staffRole = processApiResponse(data) as TournamentStaffRole;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffRoles: [...this.currentTournament.value!.staffRoles, staffRole],
        });
        return staffRole;
      }),
    );
  }

  editTournamentStaffRole(roleId: string, name: string, permissions: string[]): Observable<TournamentStaffRole> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffRole/${roleId}`, { name, permissions }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const staffRole = processApiResponse(data) as TournamentStaffRole;
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffRoles: [...this.currentTournament.value!.staffRoles].map((r) => r._id === staffRole._id ? staffRole : r),
        });
        return staffRole;
      }),
    );
  }

  removeTournamentStaffRole(roleId: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/staffRole/${roleId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshCurrentTourneyState({
          ...this.currentTournament.value!,
          staffRoles: [...this.currentTournament.value!.staffRoles].filter((r) => r._id !== roleId),
        });
        return true;
      }),
    );
  }

  addTournamentSlot(beatmapId: number, formData: any): Observable<MappoolSlot> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/slot`, { ...formData, beatmap: { beatmapId } }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const slot = processApiResponse(data) as MappoolSlot;
        this.refreshRoundState({
          ...this.currentRound.value!,
          mappool: {
            ...this.currentRound.value!.mappool,
            slots: [...this.currentRound.value!.mappool.slots, slot],
          },
        });
        return slot;
      }),
    );
  }

  editTournamentSlot(slotId: string, beatmapId: number, formData: any): Observable<MappoolSlot> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/slot/${slotId}`, { ...formData, beatmap: { beatmapId } }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const slot = processApiResponse(data) as MappoolSlot;
        this.refreshRoundState({
          ...this.currentRound.value!,
          mappool: {
            ...this.currentRound.value!.mappool,
            slots: [...this.currentRound.value!.mappool.slots].map((s) => s._id === slot._id ? slot : s),
          },
        });
        return slot;
      }),
    );
  }

  removeTournamentSlot(slotId: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/slot/${slotId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshRoundState({
          ...this.currentRound.value!,
          mappool: {
            ...this.currentRound.value!.mappool,
            slots: [...this.currentRound.value!.mappool.slots].filter((s) => s._id !== slotId),
          },
        });
        return true;
      }),
    );
  }

  refreshTournamentSlot(slotId: string): Observable<MappoolSlot> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/refreshSlot/${slotId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const slot = processApiResponse(data) as MappoolSlot;
        this.refreshRoundState({
          ...this.currentRound.value!,
          mappool: {
            ...this.currentRound.value!.mappool,
            slots: [...this.currentRound.value!.mappool.slots].map((s) => s._id === slot._id ? slot : s),
          },
        });
        return slot;
      }),
    );
  }

  addTournamentMatch(partialMatch: Partial<TournamentMatch>): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match`, partialMatch, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches, match],
        });
        return match;
      }),
    );
  }

  editTournamentMatch(matchId: string, partialMatch: Partial<TournamentMatch>): Observable<TournamentMatch> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}`, partialMatch, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  removeTournamentMatch(matchId: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => {
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].filter((m) => m._id !== matchId),
        });
        return true;
      }),
    );
  }

  submitMatch(submitMatchDto: SubmitMatchDto): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/submitMatch`, submitMatchDto, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  registerMatch(matchId: string, teamId?: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/matchRegister`, { teamId }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  unregisterMatch(matchId: string, teamId?: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/matchUnregister`, { teamId }, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  registerReferee(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/registerReferee`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  unregisterReferee(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/unregisterReferee`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  registerStreamer(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/registerStreamer`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  unregisterStreamer(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/unregisterStreamer`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  registerCommentator(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/registerCommentator`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  unregisterCommentator(matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/match/${matchId}/unregisterCommentator`, {}, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => {
        const match = processApiResponse(data) as TournamentMatch;
        this.refreshRoundState({
          ...this.currentRound.value!,
          matches: [...this.currentRound.value!.matches].map((m) => m._id === match._id ? match : m),
        });
        return match;
      }),
    );
  }

  // updating round scoresheet locally is too complicated so i'll just leave it to the existing code on the stats page (might eventually update here)
  createScore(slotId: string, playerOrTeamId: string, partialScore: Partial<Score>): Observable<Score> {
    return this.http.post(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/stats/${slotId}/${playerOrTeamId}`, partialScore, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Score; }),
    );
  }

  editScore(slotId: string, scoreId: string, partialScore: Partial<Score>): Observable<Score> {
    return this.http.patch(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/stats/${slotId}/${scoreId}`, partialScore, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((data) => { return processApiResponse(data) as Score; }),
    );
  }

  deleteScore(slotId: string, scoreId: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${this.currentTournament.value!.acronym}/round/${this.currentRound.value!._id}/stats/${slotId}/${scoreId}`, { withCredentials: true }).pipe(
      tap({ subscribe: () => this.addRequest() }),
      catchError((error) => this.notifyError(error)),
      finalize(() => this.subtractRequest()),
      map((_) => { return true; }),
    );
  }
}