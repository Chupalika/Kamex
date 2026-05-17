import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HovercardModule } from '../../components/hovercard';
import { TournamentPlayer, GameMode, TournamentTeam, TournamentStaffMember } from '../../models/models';
import { TournamentPlayerCard } from './tournament_player_card';
import { getPlayerRank } from '../utils';
import { TournamentStaffMemberCard } from './tournament_staff_member_card';

@Component({
  selector: 'tournament-player-label',
  template:
   `<span
      *ngIf="player"
      class="label"
      [class.captain]="isCaptain"
      [hovercardComponent]="isStaff ? TournamentStaffMemberCard : TournamentPlayerCard"
      [hovercardData]="{ player: player, teams: teams, gameMode: gameMode, staffMember: player }"
    >
      <img *ngIf="!flipped && !hideIcon" [ngClass]="{'square-avatar': !playerFlagsToggle, 'flag-avatar': playerFlagsToggle}" [src]="playerImage">
      {{ player.username }} <ng-container *ngIf="showRank">({{ getPlayerRankDisplay(player) }})</ng-container>
      <img *ngIf="flipped && !hideIcon" [ngClass]="{'square-avatar': !playerFlagsToggle, 'flag-avatar': playerFlagsToggle, 'flipped': true}" [src]="playerImage">
    </span>`,
  styles:
   `.label { display: flex; align-items: center; }
    .captain { font-weight: bold; }
    .square-avatar { width: 30px; height: 30px; margin-right: 6px; border-radius: 2px; object-fit: contain; }
    .flag-avatar { width: 30px; height: 20px; margin: 5px 6px 5px 0; border-radius: 2px; object-fit: contain; }
    .flipped { margin-right: unset; margin-left: 6px; }`,
})
export class TournamentPlayerLabel {
  @Input() player?: TournamentPlayer|TournamentStaffMember;
  @Input() teams: TournamentTeam[] = [];
  @Input() gameMode?: GameMode;
  @Input() playerFlagsToggle: boolean = false;
  @Input() isCaptain: boolean = false;
  @Input() showRank: boolean = false;
  @Input() isStaff: boolean = false;
  @Input() flipped: boolean = false;
  @Input() hideIcon: boolean = false;

  GameMode = GameMode;
  TournamentPlayerCard = TournamentPlayerCard;
  TournamentStaffMemberCard = TournamentStaffMemberCard;

  constructor() {}

  get playerImage() {
    if (this.playerFlagsToggle) {
      return 'https://flagcdn.com/w40/' + this.player?.country.toLowerCase() + '.png';
    } else {
      return `https://a.ppy.sh/${this.player?.playerId}`;
    }
  }

  getPlayerRankDisplay(player: TournamentPlayer) {
    const rank = getPlayerRank(player, this.gameMode!);
    return rank === Number.MAX_SAFE_INTEGER ? "Unranked" : `#${rank}`;
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
  ],
  declarations: [ TournamentPlayerLabel ],
  exports:      [ TournamentPlayerLabel ],
  bootstrap:    [ TournamentPlayerLabel ]
})
export class TournamentPlayerLabelModule {}