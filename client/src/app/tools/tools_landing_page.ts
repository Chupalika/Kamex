import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { ContentService } from '../services/content.service';
import { Page } from '../models/models';

@Component({
  selector: 'tools-landing-page',
  template:
   `<ng-container *ngFor="let content of page?.contents || []">
      <div class="mat-headline-6">{{ content.key }}</div>

      <div class="mat-body-3">
        <markdown>
          {{ content.value }}
        </markdown>
      </div>
    </ng-container>`
})
export class ToolsLandingPage {
  page?: Page;

  constructor(contentService: ContentService) {
    contentService.getPage("tools").subscribe(page => {
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
  declarations: [ ToolsLandingPage ],
  exports:      [ ToolsLandingPage ],
  bootstrap:    [ ToolsLandingPage ]
})
export class ToolsLandingPageModule {}