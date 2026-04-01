import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { BatchAssignPlayerSeedsDto, BatchAssignTeamSeedsDto, Mappool, MappoolSlot, Score, Scoresheet, SubmitMatchDto, Tournament, TournamentMatch, TournamentPlayer, TournamentRound, TournamentStaffMember, TournamentStaffRole, TournamentTeam } from '../models/models';
import { environment } from 'src/environments/environment';
import { processApiResponse } from 'src/app/tournament/utils';

@Injectable({
  providedIn: 'root'
})
export class TournamentsService {
  apiUrl = environment.apiUrl + '/api/tournament';
  currentTournament: BehaviorSubject<Tournament|undefined> = new BehaviorSubject<Tournament|undefined>(undefined);

  constructor(private http: HttpClient) {}

  resetCurrentTournament() {
    this.currentTournament.next(undefined);
  }

  getTournaments(): Observable<Tournament[]> {
    return this.http.get(`${this.apiUrl}`, { withCredentials: true })
      .pipe(map((data: any) => {
        return data.map((x: any) => processApiResponse(x)) as Tournament[];
      }));
  }

  getTournament(acronym: string): Observable<Tournament> {
    return this.http.get(`${this.apiUrl}/${acronym}`, { withCredentials: true })
      .pipe(map((data: any) => {
        const tourney = processApiResponse(data) as Tournament;
        this.currentTournament?.next(tourney);
        return tourney;
      }));
  }

  createTournament(partialTournament: Partial<Tournament>): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}`, partialTournament, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Tournament;
      }));
  }

  editTournament(partialTournament: Partial<Tournament>): Observable<Tournament> {
    return this.http.patch(`${this.apiUrl}/${partialTournament.acronym}`, partialTournament, { withCredentials: true })
      .pipe(map((data) => {
        const tourney = processApiResponse(data) as Tournament;
        this.currentTournament?.next(tourney);
        return tourney;
      }));
  }

  uploadTourneyBanner(acronym: string, file: File): Observable<Tournament> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${acronym}/banner`, formData, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Tournament;
      }));
  }

  uploadTourneyCategoryIcon(acronym: string, categoryName: string, file: File): Observable<Tournament> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${acronym}/categoryIcon/${categoryName}`, formData, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Tournament;
      }));
  }

  createTournamentRound(acronym: string, partialRound: Partial<TournamentRound>): Observable<TournamentRound> {
    return this.http.post(`${this.apiUrl}/${acronym}/round`, partialRound, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentRound;
      }));
  }

  getTournamentRound(acronym: string, roundId: string): Observable<TournamentRound> {
    return this.http.get(`${this.apiUrl}/${acronym}/round/${roundId}`, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentRound;
      }));
  }

  editTournamentRound(acronym: string, roundId: string, partialRound: Partial<TournamentRound>): Observable<TournamentRound> {
    return this.http.patch(`${this.apiUrl}/${acronym}/round/${roundId}`, partialRound, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentRound;
      }));
  }

  removeTournamentRound(acronym: string, roundId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/round/${roundId}`, { withCredentials: true });
  }

  getTournamentMappool(acronym: string, mappoolId: string) {
    return this.http.get(`${this.apiUrl}/${acronym}/mappool/${mappoolId}`, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Mappool;
      }));
  }

  getTournamentScoresheet(acronym: string, scoresheetId: string) {
    return this.http.get(`${this.apiUrl}/${acronym}/scoresheet/${scoresheetId}`, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Scoresheet;
      }));
  }

  register(acronym: string): Observable<TournamentPlayer> {
    return this.http.post(`${this.apiUrl}/${acronym}/register`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentPlayer;
      }));
  }

  unregister(acronym: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/unregister`, { withCredentials: true });
  }

  addTournamentPlayer(acronym: string, playerId: number, partialPlayer: Partial<TournamentPlayer>): Observable<TournamentPlayer> {
    return this.http.post(`${this.apiUrl}/${acronym}/player/${playerId}`, partialPlayer, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentPlayer;
      }));
  }

  editTournamentPlayer(acronym: string, playerId: number, partialPlayer: Partial<TournamentPlayer>): Observable<TournamentPlayer> {
    return this.http.patch(`${this.apiUrl}/${acronym}/player/${playerId}`, partialPlayer, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentPlayer;
      }));
  }

  refreshPlayers(acronym: string) {
    return this.http.post(`${this.apiUrl}/${acronym}/refreshPlayers`, { withCredentials: true });
  }

  removeTournamentPlayer(acronym: string, playerId: number) {
    return this.http.delete(`${this.apiUrl}/${acronym}/player/${playerId}`, { withCredentials: true });
  }

  addTournamentTeam(acronym: string, partialTeam: Partial<TournamentTeam>): Observable<TournamentTeam> {
    return this.http.post(`${this.apiUrl}/${acronym}/team`, partialTeam, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentTeam;
      }));
  }

  editTournamentTeam(acronym: string, teamId: string, partialTeam: Partial<TournamentTeam>): Observable<TournamentTeam> {
    return this.http.patch(`${this.apiUrl}/${acronym}/team/${teamId}`, partialTeam, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentTeam;
      }));
  }

  removeTournamentTeam(acronym: string, teamId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/team/${teamId}`, { withCredentials: true });
  }

  updateTeamName(acronym: string, teamId: string, newName: string): Observable<TournamentTeam> {
    return this.http.patch(`${this.apiUrl}/${acronym}/teamName/${teamId}`, { name: newName }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentTeam;
      }));
  }

  uploadTeamImage(acronym: string, teamId: string, file: File): Observable<TournamentTeam> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${acronym}/teamImage/${teamId}`, formData, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentTeam;
      }));
  }

  batchAssignPlayerSeeds(acronym: string, dto: BatchAssignPlayerSeedsDto): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}/${acronym}/batchAssignPlayerSeeds`, dto, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Tournament;
      }));
  }

  batchAssignTeamSeeds(acronym: string, dto: BatchAssignTeamSeedsDto): Observable<Tournament> {
    return this.http.post(`${this.apiUrl}/${acronym}/batchAssignTeamSeeds`, dto, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Tournament;
      }));
  }

  addTournamentStaffMember(acronym: string, playerId: number, roles: TournamentStaffRole[]): Observable<TournamentStaffMember> {
    return this.http.post(`${this.apiUrl}/${acronym}/staffMember/${playerId}`, { roles }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentStaffMember;
      }));
  }

  editTournamentStaffMember(acronym: string, playerId: number, roles: TournamentStaffRole[]): Observable<TournamentStaffMember> {
    return this.http.patch(`${this.apiUrl}/${acronym}/staffMember/${playerId}`, { roles }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentStaffMember;
      }));
  }

  removeTournamentStaffMember(acronym: string, playerId: number) {
    return this.http.delete(`${this.apiUrl}/${acronym}/staffMember/${playerId}`, { withCredentials: true });
  }

  addTournamentStaffRole(acronym: string, name: string, permissions: string[]): Observable<TournamentStaffRole> {
    return this.http.post(`${this.apiUrl}/${acronym}/staffRole`, { name, permissions }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentStaffRole;
      }));
  }

  editTournamentStaffRole(acronym: string, roleId: string, name: string, permissions: string[]): Observable<TournamentStaffRole> {
    return this.http.patch(`${this.apiUrl}/${acronym}/staffRole/${roleId}`, { name, permissions }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentStaffRole;
      }));
  }

  removeTournamentStaffRole(acronym: string, roleId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/staffRole/${roleId}`, { withCredentials: true });
  }

  addTournamentSlot(acronym: string, roundId: string, beatmapId: number, formData: any): Observable<MappoolSlot> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/slot`, { ...formData, beatmap: { beatmapId } }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as MappoolSlot;
      }));
  }

  editTournamentSlot(acronym: string, roundId: string, slotId: string, beatmapId: number, formData: any): Observable<MappoolSlot> {
    return this.http.patch(`${this.apiUrl}/${acronym}/round/${roundId}/slot/${slotId}`, { ...formData, beatmap: { beatmapId } }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as MappoolSlot;
      }));
  }

  removeTournamentSlot(acronym: string, roundId: string, slotId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/round/${roundId}/slot/${slotId}`, { withCredentials: true });
  }

  /*
  addTournamentLobby(acronym: string, roundId: string, id: string, time: Date, players: TournamentPlayer[], teams: TournamentTeam[], matchIds: number[]): Observable<TournamentLobby> {
    console.log('addLobby');
    const minimizedPlayers = players.map((player) => ({_id: player._id}));
    const minimizedTeams = teams.map((team) => ({_id: team._id}));
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/lobby`, { id, time, players: minimizedPlayers, teams: minimizedTeams, matchIds }, { withCredentials: true })
      .pipe(map((data) => {
        console.log(data);
        return convertDatesInObject(data) as TournamentLobby;
      }));
  }

  editTournamentLobby(acronym: string, roundId: string, lobbyId: string, id: string, time: Date, players: TournamentPlayer[], teams: TournamentTeam[], matchIds: number[]): Observable<TournamentLobby> {
    console.log('editLobby');
    const minimizedPlayers = players.map((player) => ({_id: player._id}));
    const minimizedTeams = teams.map((team) => ({_id: team._id}));
    return this.http.patch(`${this.apiUrl}/${acronym}/round/${roundId}/lobby/${lobbyId}`, { id, time, players: minimizedPlayers, teams: minimizedTeams, matchIds }, { withCredentials: true })
      .pipe(map((data) => {
        console.log(data);
        return convertDatesInObject(data) as TournamentLobby;
      }));
  }
  */

  addTournamentMatch(acronym: string, roundId: string, partialMatch: Partial<TournamentMatch>): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match`, partialMatch, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  editTournamentMatch(acronym: string, roundId: string, matchId: string, partialMatch: Partial<TournamentMatch>): Observable<TournamentMatch> {
    return this.http.patch(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}`, partialMatch, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  removeTournamentMatch(acronym: string, roundId: string, matchId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}`, { withCredentials: true });
  }

  submitMatch(acronym: string, roundId: string, submitMatchDto: SubmitMatchDto): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/submitMatch`, submitMatchDto, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  registerMatch(acronym: string, roundId: string, matchId: string, teamId?: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/matchRegister`, { teamId }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  unregisterMatch(acronym: string, roundId: string, matchId: string, teamId?: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/matchUnregister`, { teamId }, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  registerReferee(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/registerReferee`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  unregisterReferee(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/unregisterReferee`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  registerStreamer(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/registerStreamer`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  unregisterStreamer(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/unregisterStreamer`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  registerCommentator(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/registerCommentator`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  unregisterCommentator(acronym: string, roundId: string, matchId: string): Observable<TournamentMatch> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/match/${matchId}/unregisterCommentator`, {}, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as TournamentMatch;
      }));
  }

  createScore(acronym: string, roundId: string, slotScoresheetId: string, playerOrTeamId: string, partialScore: Partial<Score>): Observable<Score> {
    return this.http.post(`${this.apiUrl}/${acronym}/round/${roundId}/stats/${slotScoresheetId}/${playerOrTeamId}`, partialScore, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Score;
      }));
  }

  editScore(acronym: string, roundId: string, slotScoresheetId: string, scoreId: string, partialScore: Partial<Score>): Observable<Score> {
    return this.http.patch(`${this.apiUrl}/${acronym}/round/${roundId}/stats/${slotScoresheetId}/${scoreId}`, partialScore, { withCredentials: true })
      .pipe(map((data) => {
        return processApiResponse(data) as Score;
      }));
  }

  deleteScore(acronym: string, roundId: string, slotScoresheetId: string, scoreId: string) {
    return this.http.delete(`${this.apiUrl}/${acronym}/round/${roundId}/stats/${slotScoresheetId}/${scoreId}`, { withCredentials: true });
  }
}