import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HovercardModule } from '../../components/hovercard';
import { GameMode, TournamentTeam } from '../../models/models';
import { TournamentTeamCard } from './tournament_team_card';

@Component({
  selector: 'tournament-team-label',
  template:
   `<span
      *ngIf="team"
      class="label"
      [hovercardComponent]="TournamentTeamCard"
      [hovercardData]="{ team: team, gameMode: gameMode, playerFlagsToggle: playerFlagsToggle, playerSortMethod: playerSortMethod }"
    >
      <div class="img-container" *ngIf="team.imageLink && !flipped && !hideIcon"><img class="team-image" [src]="team.imageLink" /></div>
      <div *ngIf="!team.imageLink && !flipped && !hideIcon" class="team-image empty"></div>
      <span class="name">{{ team.name }}</span>
      <div *ngIf="!team.imageLink && flipped && !hideIcon" class="team-image empty flipped"></div>
      <div class="img-container" *ngIf="team.imageLink && flipped && !hideIcon"><img class="team-image flipped"[src]="team.imageLink" /></div>
    </span>`,
  styles:
   `.label { display: flex; align-items: center; line-height: 30px; }
    .name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
    .img-container { display: flex; align-self: flex-start; }
    .team-image { width: 30px; height: 30px; margin-right: 6px; border-radius: 2px; object-fit: contain; }
    .flipped { margin-right: unset; margin-left: 6px; }
    .empty { border: 1px solid var(--mat-fab-disabled-state-container-color); }`,
})
export class TournamentTeamLabel {
  @Input() team?: TournamentTeam;
  @Input() gameMode?: GameMode;
  @Input() playerFlagsToggle: boolean = false;
  @Input() playerSortMethod: string = "rank";
  @Input() flipped: boolean = false;
  @Input() hideIcon: boolean = false;

  GameMode = GameMode;
  TournamentTeamCard = TournamentTeamCard;

  constructor() {}
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
  ],
  declarations: [ TournamentTeamLabel ],
  exports:      [ TournamentTeamLabel ],
  bootstrap:    [ TournamentTeamLabel ]
})
export class TournamentTeamLabelModule {}