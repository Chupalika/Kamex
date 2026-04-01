import { Component, NgModule, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from "@angular/material/toolbar";
import { TournamentsService } from '../services/tournaments.service';

@Component({
  selector: 'item-selector',
  templateUrl: './item_selector.html',
  styleUrls: ['./item_selector.scss']
})
export class ItemSelector {
  @Input() labels: string[] = [];
  @Input() defaultLabel?: string = "";
  @Input() isVertical: boolean = false;
  @Input() selectedIndex: number = -1;
  @Output() selectedIndexChange: EventEmitter<number> = new EventEmitter();
  
  customThemeEnabled = false;

  constructor(private tournamentsService: TournamentsService) {
    this.tournamentsService.currentTournament.subscribe((tourney) => {
      if (tourney?.theme.primaryColor || tourney?.theme.accentColor) {
        this.customThemeEnabled = true;
      } else {
        this.customThemeEnabled = false;
      }
    });
  }

  switchSelectedIndex(index: number) {
    // this.selectedIndex = index; // let parent component handle this
    this.selectedIndexChange.emit(index);
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  declarations: [ ItemSelector ],
  exports:      [ ItemSelector ],
  bootstrap:    [ ItemSelector ]
})
export class ItemSelectorModule {}
