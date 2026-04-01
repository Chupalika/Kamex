import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

const NAVBAR_EXCLUDE_ROUTES: RegExp[] = [/^\/tools\//];

@Injectable({
  providedIn: 'root'
})
export class NavbarService {
  private hideNavbarSubject = new BehaviorSubject<boolean>(true);
  hideNavbar$ = this.hideNavbarSubject.asObservable();

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event) => {
      const event2 = event as NavigationStart;
      this.hideNavbarSubject.next(NAVBAR_EXCLUDE_ROUTES.some(regex => regex.test(event2.url)));
    });
  }
}