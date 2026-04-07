import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { ContentService } from '../services/content.service';
import { Page } from '../models/models';

@Component({
  selector: 'about-page',
  templateUrl: './about_page.html',
  styleUrls: ['./about_page.scss']
})
export class AboutPage {
  page?: Page;

  constructor(contentService: ContentService) {
    contentService.getPage("about").subscribe(page => {
      this.page = page;
    });
  }
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