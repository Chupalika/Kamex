import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'page-not-found-page',
  template: 
   `<div class="mat-headline-5">404</div>
    <div class="mat-body-1">wtf why are you here this page doesn't exist</div>`,
  styles: ``
})
export class PageNotFoundPage {
  constructor() {}
}

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [ PageNotFoundPage ],
  exports:      [ PageNotFoundPage ],
  bootstrap:    [ PageNotFoundPage ]
})
export class PageNotFoundPageModule {}