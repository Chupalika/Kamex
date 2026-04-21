import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import tinycolor from 'tinycolor2';

import { GameMode, MappoolSlot, TournamentSlotCategory } from '../../models/models';
import { slotStarRating, slotDisplayLength, slotBpm, slotCs, slotHp, slotOd, slotAr } from '../utils';

@Component({
  selector: 'tournament-slot-card',
  templateUrl: './tournament_slot_card.html',
  styleUrls: ['./tournament_slot_card.scss']
})
export class TournamentSlotCard {
  @Input() slot?: MappoolSlot;
  @Input() category?: TournamentSlotCategory;
  //@Input() tournamentAcronym?: string;

  GameMode = GameMode;

  constructor() {}

  /*
  getCustomModIcon(mod: string) {
    return `./assets/${this.tournamentAcronym}/mods/${mod}.png`;
  }

  replaceWithDefaultModIcon(event: Event, mod: string) {
    (event.target as HTMLImageElement).src = `./assets/default/mods/${mod}.png`;
  }
  */

  copyBeatmapId() {
    navigator.clipboard.writeText(this.slot!.beatmap.beatmapId.toString());
  }

  get starRating() {
    return slotStarRating(this.slot!);
  }

  get displayLength() {
    return slotDisplayLength(this.slot!);
  }

  get bpm() {
    return slotBpm(this.slot!);
  }

  get cs() {
    return slotCs(this.slot!);
  }

  get hp() {
    return slotHp(this.slot!);
  }

  get od() {
    return slotOd(this.slot!);
  }

  get ar() {
    return slotAr(this.slot!);
  }

  get backgroundColor() {
    return this.category?.color ?? "";
  }

  get textColor() {
    return this.category?.color ? (tinycolor(this.category.color).isLight() ? "000" : "fff") : "000";
  }

  get iconLink() {
    return this.category?.iconLink ?? "";
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
  ],
  declarations: [ TournamentSlotCard ],
  exports:      [ TournamentSlotCard ],
  bootstrap:    [ TournamentSlotCard ]
})
export class TournamentSlotCardModule {}