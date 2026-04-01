import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { AppUser } from '../models/models';
import { processApiResponse } from 'src/app/tournament/utils';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiUrl = environment.apiUrl + "/api/auth";
  private appUserSubject = new BehaviorSubject<AppUser|undefined>(undefined);
  appUser$ = this.appUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  setUser(user: AppUser) {
    this.appUserSubject.next(user);
  }

  clearUser() {
    this.appUserSubject.next(undefined);
  }

  getCurrentUser(): AppUser|undefined {
    return this.appUserSubject.getValue();
  }

  loginOsu(): Observable<AppUser> {
    return this.http.get(`${this.apiUrl}/login-osu`)
      .pipe(map((data) => {
        const appUser: AppUser = processApiResponse(data);
        this.setUser(appUser);
        return appUser;
      }));
  }

  logoutOsu() {
    return this.http.get(`${this.apiUrl}/logout-osu`, { withCredentials: true })
      .pipe(map((data) => {
        this.clearUser();
        return data;
      }));
  }

  whoami(): Observable<AppUser|undefined> {
    return this.http.get(`${this.apiUrl}/whoami`, { withCredentials: true})
      .pipe(map((data: any) => {
        if (data === null) return undefined;
        const appUser: AppUser = processApiResponse(data);
        this.setUser(appUser);
        return appUser;
      }));
  }

  loginDiscord(): Observable<AppUser> {
    return this.http.get(`${this.apiUrl}/login-discord`)
      .pipe(map((data) => {
        const appUser: AppUser = processApiResponse(data);
        this.setUser(appUser);
        return appUser;
      }));
  }

  logoutDiscord(): Observable<AppUser> {
    return this.http.get(`${this.apiUrl}/logout-discord`, { withCredentials: true })
      .pipe(map((data) => {
        const appUser: AppUser = processApiResponse(data);
        this.setUser(appUser);
        return appUser;
      }));
  }

  updateUserSettings(partialAppUser: Partial<AppUser>): Observable<AppUser> {
    return this.http.patch(`${this.apiUrl}/update-user-settings`, partialAppUser, { withCredentials: true })
      .pipe(map((data) => {
        const appUser: AppUser = processApiResponse(data);
        this.setUser(appUser);
        return appUser;
      }));
  }
}