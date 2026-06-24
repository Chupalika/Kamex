import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'front-page',
  template:
   `<div class="mat-headline-6">Welcome to Kamex!</div>

    <div class="mat-body-3">Click here for tournaments 👇</div>

    <div class="mat-body-1"><a routerLink="/tournament">Tournament Landing Page</a></div>`
})
export class FrontPage {
}

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
  ],
  declarations: [ FrontPage ],
  exports:      [ FrontPage ],
  bootstrap:    [ FrontPage ]
})
export class FrontPageModule {}
