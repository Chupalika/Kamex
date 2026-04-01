import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import tinycolor from 'tinycolor2';

import { GameMode, MappoolSlot, TournamentSlotCategory } from '../../models/models';
import { convertFromLazerMods } from '../utils';

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
    return this.slot?.adjustedStarRating?.toPrecision(3) || this.slot?.beatmap.starRating.toPrecision(3);
  }

  get displayLength() {
    const length = this.slot!.beatmap.length;
    if (convertFromLazerMods(this.slot?.requiredMods).includes("DT") || convertFromLazerMods(this.slot?.requiredMods).includes("NC")) {
      const adjustedLength = Math.floor(length / 1.5);
      return `${Math.floor(adjustedLength / 60)}:${(adjustedLength % 60).toString().padStart(2, "0")}`;
    }
    return `${Math.floor(length / 60)}:${(length % 60).toString().padStart(2, "0")}`;
  }

  get bpm() {
    if (convertFromLazerMods(this.slot?.requiredMods).includes("DT") || convertFromLazerMods(this.slot?.requiredMods).includes("NC")) return this.slot!.beatmap.bpm * 1.5;
    else return this.slot!.beatmap.bpm;
  }

  get cs() {
    if (convertFromLazerMods(this.slot?.requiredMods).includes("HR")) return this.getHrAdjustedStat(this.slot!.beatmap.cs);
    if (convertFromLazerMods(this.slot?.requiredMods).includes("EZ")) return this.getEzAdjustedStat(this.slot!.beatmap.cs);
    return this.slot!.beatmap.cs;
  }

  get hp() {
    if (convertFromLazerMods(this.slot?.requiredMods).includes("HR")) return this.getHrAdjustedStat(this.slot!.beatmap.hp);
    if (convertFromLazerMods(this.slot?.requiredMods).includes("EZ")) return this.getEzAdjustedStat(this.slot!.beatmap.hp);
    return this.slot!.beatmap.hp;
  }

  get od() {
    if (convertFromLazerMods(this.slot?.requiredMods).includes("HR")) return this.getHrAdjustedStat(this.slot!.beatmap.od);
    if (convertFromLazerMods(this.slot?.requiredMods).includes("EZ")) return this.getEzAdjustedStat(this.slot!.beatmap.od);
    return this.slot!.beatmap.od;
  }

  get ar() {
    if (convertFromLazerMods(this.slot?.requiredMods).includes("HR")) return this.getHrAdjustedStat(this.slot!.beatmap.ar);
    if (convertFromLazerMods(this.slot?.requiredMods).includes("EZ")) return this.getEzAdjustedStat(this.slot!.beatmap.ar);
    return this.slot!.beatmap.ar;
  }

  getHrAdjustedStat(stat: number) {
    return Math.min(stat * 1.4, 10).toPrecision(2);
  }

  getEzAdjustedStat(stat: number) {
    return (stat / 2).toPrecision(2);
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