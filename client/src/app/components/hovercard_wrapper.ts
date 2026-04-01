import { Component, Input, NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'hovercard-wrapper',
  template: `
    <div *ngIf="hovercardComponent"
         class="hovercard-wrapper"
         [ngClass]="{ 'mat-app-background': addBackground, 'mat-elevation-z4': addBackground, 'hovercard-wrapper-2': addBackground }"
    >
      <ng-container *ngComponentOutlet="hovercardComponent; inputs: hovercardData"></ng-container>
    </div>
  `,
  styles: [`
    .hovercard-wrapper {
      color: var(--card-fg);
    }
    .hovercard-wrapper-2 {
      padding: 8px;
      border-radius: 8px;
    }
  `]
})
export class HovercardWrapper {
  @Input() hovercardComponent?: Type<unknown>;
  @Input() hovercardData: Record<string, any> = {};
  @Input() addBackground = false;
}

@NgModule({
  declarations: [ HovercardWrapper ],
  imports: [ CommonModule ],
  exports: [ HovercardWrapper ]
})
export class HovercardWrapperModule {}