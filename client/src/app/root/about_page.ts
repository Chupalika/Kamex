import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'about-page',
  templateUrl: './about_page.html',
  styleUrls: ['./about_page.scss']
})
export class AboutPage {
}

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule,
    RouterModule,
  ],
  declarations: [ AboutPage ],
  exports:      [ AboutPage ],
  bootstrap:    [ AboutPage ]
})
export class AboutPageModule {}