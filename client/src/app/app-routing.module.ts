import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FrontPage } from './root/front_page';
import { AboutPage } from './root/about_page';
import { AdminPage } from './root/admin_page';
import { TournamentLandingPage } from './tournament/pages/tournament_landing_page';
import { TournamentFrontPage } from './tournament/pages/tournament_front_page';
import { TournamentRegistrationPage } from './tournament/pages/tournament_registration_page';
import { TournamentMappoolPage } from './tournament/pages/tournament_mappool_page';
import { TournamentMatchesPage } from './tournament/pages/tournament_matches_page';
import { TournamentParticipantsPage } from './tournament/pages/tournament_participants_page';
import { TournamentSettingsPage } from './tournament/pages/tournament_settings_page';
import { TournamentStatsPage } from './tournament/pages/tournament_stats_page';
import { TeamReveal } from './tools/team_reveal/team_reveal';
import { StatsReveal } from './tools/stats_reveal/stats_reveal';
import { LMSOverlay } from './tools/lms_overlay/lms_overlay';
import { SuijiTeamPairer } from './tools/suiji_team_pairer/suiji_team_pairer';

const routes: Routes = [
  { path: '', component: FrontPage, title: "Kamex" },
  { path: 'about', component: AboutPage, title: "Kamex About Page" },
  { path: 'admin', component: AdminPage, title: "Kamex Admin Page" },
  { path: 'tournament', component: TournamentLandingPage, title: "Kamex Tournaments" },
  { path: 'tournament/:acronym', component: TournamentFrontPage },
  { path: 'tournament/:acronym/registration', component: TournamentRegistrationPage },
  { path: 'tournament/:acronym/mappools', component: TournamentMappoolPage },
  { path: 'tournament/:acronym/matches', component: TournamentMatchesPage },
  { path: 'tournament/:acronym/participants', component: TournamentParticipantsPage },
  { path: 'tournament/:acronym/settings', component: TournamentSettingsPage },
  { path: 'tournament/:acronym/stats', component: TournamentStatsPage },
  { path: 'tools/team-reveal', component: TeamReveal },
  { path: 'tools/stats-reveal/:acronym/:roundId', component: StatsReveal },
  { path: 'tools/suiji-team-pairer', component: SuijiTeamPairer },
  { path: 'tools/lms-overlay', component: LMSOverlay },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
