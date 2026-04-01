import { Component, OnInit } from '@angular/core';
import { NavbarService } from './services/navbar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Kamex';
  showNavbar = false;

  constructor(private navbarService: NavbarService) {}

  ngOnInit() {
    this.navbarService.hideNavbar$.subscribe(hide => {
      this.showNavbar = !hide;
    });
  }
}
