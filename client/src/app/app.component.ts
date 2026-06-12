import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NavbarService } from './services/navbar.service';
import { TournamentsService } from './services/tournaments.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Kamex';
  showNavbar = false;
  overlayMode = false;

  constructor(private navbarService: NavbarService, private tournamentsService: TournamentsService, private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.navbarService.hideNavbar$.subscribe(hide => { this.showNavbar = !hide; });
    this.tournamentsService.notifications$.subscribe((message) => { this.snackBar.open(message, "", { duration: 10000 }); });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.overlayMode = this.router.url.includes('/tools/');
    });
  }
}
