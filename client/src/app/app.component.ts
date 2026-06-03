import { Component, OnInit } from '@angular/core';
import { NavbarService } from './services/navbar.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Kamex';
  showNavbar = false;
  overlayMode = false;

  constructor(private navbarService: NavbarService, private router: Router) {}

  ngOnInit() {
    this.navbarService.hideNavbar$.subscribe(hide => {
      this.showNavbar = !hide;
    });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.overlayMode = this.router.url.includes('/tools/');
    });
  }
}
