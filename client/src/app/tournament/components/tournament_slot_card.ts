import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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

  GameMode = GameMode;

  constructor() {}

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

  get mainMapper() {
    if (this.slot!.beatmap.mappers.length === 0) return this.slot!.beatmap.mapper;
    else return this.slot!.beatmap.mappers.find((mapper) => mapper === this.slot!.beatmap.mapper);
  }

  get additionalMappers() {
    // if (this.slot!.beatmap.mappers.length === 0) return [this.slot!.beatmap.mapper];
    // // move the main mapper to the front
    // const mainMapper = this.slot!.beatmap.mappers.find((mapper) => mapper === this.slot!.beatmap.mapper);
    // if (mainMapper) return [mainMapper, ...this.slot!.beatmap.mappers.filter((mapper) => mapper !== this.slot!.beatmap.mapper)];
    return this.slot!.beatmap.mappers.filter((mapper) => mapper !== this.slot!.beatmap.mapper);
  }

  get mapperString() {
    let ans = "";
    if (this.mainMapper) {
      ans += this.mainMapper;
      if (this.additionalMappers.length === 1) ans += ` & ${this.additionalMappers[0]}`;
      else if (this.additionalMappers.length > 1) ans += ` + ${this.additionalMappers.length}`;
    } else {
      if (this.additionalMappers.length === 1) ans += this.additionalMappers[0];
      if (this.additionalMappers.length === 2) ans += `${this.additionalMappers[0]} & ${this.additionalMappers[1]}`;
      else if (this.additionalMappers.length > 2) ans += `${this.additionalMappers.length} Mappers`;
    }
    return ans;
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  declarations: [ TournamentSlotCard ],
  exports:      [ TournamentSlotCard ],
  bootstrap:    [ TournamentSlotCard ]
})
export class TournamentSlotCardModule {}