import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from "@angular/material/toolbar";
import { Router, ActivatedRoute, Params, RouterModule } from '@angular/router';
import { AppUser, Tournament } from 'src/app/models/models';
import { AuthService } from 'src/app/services/auth.service';
import { ThemeService } from 'src/app/services/custom-theme.service';
import { TournamentsService } from 'src/app/services/tournaments.service';
import { UserSettingsDialog } from '../components/user_settings_dialog';

@Component({
  selector: 'nav-bar',
  templateUrl: './nav_bar.html',
  styleUrls: ['./nav_bar.scss']
})
export class NavBar {
  tourney?: Tournament;
  tourneyPath = "";
  appUser?: AppUser;
  mobileMode = false;

  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authService: AuthService,
      private tournamentService: TournamentsService,
      private themeService: ThemeService,
      private breakpointObserver: BreakpointObserver,
      private dialogService: MatDialog) {
    /*
    this.route.paramMap.pipe(
      tap((params: ParamMap) => {
        this.tourneyPath = `/tournament/${params.get("acronym")}` || "";
      })).subscribe();
    */
    this.router.events.subscribe((event: any) => {
      let r = this.route;
      while (r.firstChild) {
        r = r.firstChild;
      }
      r.params.subscribe((params: Params) => {
        if (params["acronym"]) {
          this.tourneyPath = `/tournament/${params["acronym"]}`;
        } else {
          this.tourneyPath = '';
          this.tournamentService.resetCurrentTournament();
        }
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
    this.tournamentService.currentTournament.subscribe((tourney) => {
      this.tourney = tourney;
      if (tourney?.theme.primaryColor || tourney?.theme.accentColor || tourney?.theme.fontName) {
        this.themeService.updateTheme(tourney.theme.primaryColor, tourney.theme.accentColor, tourney.theme.fontName);
      } else {
        this.themeService.updateTheme();
      }
    });
    this.authService.appUser$.subscribe((user) => this.appUser = user);
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
    //popup?.addEventListener("beforeunload", (event) => console.log(event));
    //popup?.addEventListener("close", (event) => console.log(event));
    
    //this.authService.loginOsu().subscribe((what) => console.log(what));
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
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
    MatToolbarModule,
  ],
  declarations: [ NavBar ],
  exports:      [ NavBar ],
  bootstrap:    [ NavBar ]
})
export class NavBarModule {}
