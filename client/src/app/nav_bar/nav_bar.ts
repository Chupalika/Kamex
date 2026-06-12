import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute, Params, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { UserSettingsDialog } from 'src/app/components/user_settings_dialog';
import { AppUser, Tournament } from 'src/app/models/models';
import { AuthService } from 'src/app/services/auth.service';
import { ThemeService } from 'src/app/services/custom-theme.service';
import { TournamentsService } from 'src/app/services/tournaments.service';

const PAGES_NEEDING_LOADED_ROUND = ["mappools", "matches", "stats", "settings"];

@Component({
  selector: 'nav-bar',
  templateUrl: './nav_bar.html',
  styleUrls: ['./nav_bar.scss']
})
export class NavBar {
  loadingTourney = false;
  loadingRound = false;
  tourney?: Tournament;
  tourneyPath = "";
  appUser?: AppUser;
  mobileMode = false;
  activeLanguage = "en";
  currentPage = "";

  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authService: AuthService,
      private tournamentService: TournamentsService,
      private themeService: ThemeService,
      private breakpointObserver: BreakpointObserver,
      private dialogService: MatDialog,
      private translocoService: TranslocoService) {
    this.router.events.subscribe((event: any) => {
      let r = this.route;
      while (r.firstChild) {
        r = r.firstChild;
      }
      r.params.subscribe((params: Params) => {
        if (params["acronym"]) {
          this.tourneyPath = `/tournament/${params["acronym"]}`;
          this.tournamentService.loadOrRefreshTournament(params["acronym"]);
        } else {
          this.tourneyPath = '';
          this.tournamentService.clearCurrentTournament();
        }
        this.currentPage = this.router.url.split('/').at(-1) ?? "";
      });
    });
    this.refreshUser();
    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
        .subscribe((result: BreakpointState) => {
      if (result.matches) {
          this.mobileMode = true;
      } else {
          this.mobileMode = false;
      }
    });
    this.tournamentService.loadingTournament$.subscribe((loading) => this.loadingTourney = loading);
    this.tournamentService.loadingRound$.subscribe((loading) => this.loadingRound = loading);
    this.tournamentService.currentTournament$.subscribe((tourney) => {
      this.tourney = tourney;
      if (tourney?.theme.primaryColor || tourney?.theme.accentColor || tourney?.theme.fontName) {
        this.themeService.updateTheme(tourney.theme.primaryColor, tourney.theme.accentColor, tourney.theme.fontName);
      } else {
        this.themeService.updateTheme();
      }
    });
    this.authService.appUser$.subscribe((user) => this.appUser = user);
    const savedLanguage = localStorage.getItem("language") ?? "en";
    this.changeLanguage(savedLanguage);
  }

  refreshUser() {
    this.authService.whoami().subscribe((appUser) => {
      this.appUser = appUser;
    });
  }

  getLink(path: string) {
    return `${this.tourneyPath}/${path}`;
  }

  login() {
    const width = 600;
    const height = 800;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    const popup = window.open(
      `${this.authService.apiUrl}/login-osu`,
      "",
      `toolbar=no, location=no, directories=no, status=no, menubar=no,
       scrollbars=no, resizable=no, copyhistory=no, width=${width},
       height=${height}, top=${top}, left=${left}`);
    const loop = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(loop);
        this.refreshUser();
      }
    });
  }

  logout() {
    this.authService.logoutOsu().subscribe(() => {
      this.appUser = undefined;
    });
  }

  get isStaffMember() {
    return this.appUser &&
           (this.appUser.osuId === this.tourney?.ownerId ||
            this.tourney?.staffMembers.find((staffMember) => staffMember.playerId === this.appUser?.osuId) !== undefined);
  }

  openUserSettings() {
    this.dialogService.open(UserSettingsDialog, {
      data: {
        appUser: this.appUser,
      }
    });
  }

  changeLanguage(language: string) {
    this.activeLanguage = language;
    this.translocoService.setActiveLang(this.activeLanguage);
    localStorage.setItem("language", language);
  }

  get lastUpdatedText(): string {
    const tourneyDataTimestamp = this.tournamentService.getCurrentTourneyLastUpdated();
    const roundDataTimestamp = this.tournamentService.getCurrentRoundLastUpdated();
    let ans = `Tournament data last fetched ${((Date.now() - tourneyDataTimestamp.getTime()) / 60000).toFixed()} minutes ago`;
    if (PAGES_NEEDING_LOADED_ROUND.includes(this.currentPage) && roundDataTimestamp) {
      ans += ` | Round data last fetched ${((Date.now() - roundDataTimestamp.getTime()) / 60000).toFixed()} minutes ago`
    }
    return ans;
  }

  triggerRefresh() {
    this.tournamentService.loadOrRefreshTournament(this.tourney!.acronym, true, true);
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatToolbarModule,
    MatTooltipModule,
    TranslocoModule,
  ],
  declarations: [ NavBar ],
  exports:      [ NavBar ],
  bootstrap:    [ NavBar ]
})
export class NavBarModule {}
