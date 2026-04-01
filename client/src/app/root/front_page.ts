import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'front-page',
  templateUrl: './front_page.html',
  styleUrls: ['./front_page.scss']
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
