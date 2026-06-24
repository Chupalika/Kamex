import { Component, NgModule, Input, ViewChild, ElementRef, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';

import { TournamentTeam, GameMode, TournamentPlayer } from '../../models/models';
import { TournamentPlayerCard } from './tournament_player_card';
import { HovercardModule } from 'src/app/components/hovercard';
import { getRankCompare, playerNameCompare, seedCompare } from '../utils';

@Component({
  selector: 'tournament-team-card',
  templateUrl: './tournament_team_card.html',
  styleUrls: ['./tournament_team_card.scss']
})
export class TournamentTeamCard {
  @Input() team?: TournamentTeam;
  @Input() gameMode?: GameMode;
  @Input() editable: boolean = false;
  @Input() requestInProgress: boolean = false;
  @Input() mobileMode: boolean = false;
  @Input() playerFlagsToggle: boolean = false;
  @Input() playerSortMethod: string = "";
  @Output() removePlayer: EventEmitter<any> = new EventEmitter();
  @Output() transferCaptain: EventEmitter<any> = new EventEmitter();

  @ViewChild('teamName') teameNameRef?: ElementRef;

  GameMode = GameMode;
  TournamentPlayerCard = TournamentPlayerCard;

  constructor() {}

  get isNameOverflowing() {
    const theElement = this.teameNameRef?.nativeElement;
    return theElement ? (theElement.scrollHeight > theElement.clientHeight || theElement.scrollWidth > theElement.clientWidth) : false;
  }

  get captain() {
    return this.team?.players[0];
  }

  get sortedPlayers() {
    if (!this.team) return [];
    const playersClone = [...this.team.players];
    switch (this.playerSortMethod) {
      case "seed": return playersClone.sort(seedCompare);
      case "name": return playersClone.sort(playerNameCompare);
      case "rank": return playersClone.sort(getRankCompare(this.gameMode!));
      default: return this.team.players;
    }
  }

  getPlayerImage(player: TournamentPlayer) {
    if (this.playerFlagsToggle) {
      return 'https://flagcdn.com/w40/' + player.country.toLowerCase() + '.png';
    } else {
      return `https://a.ppy.sh/${player.playerId}`;
    }
  }

  removePlayerHelper(index: number) {
    if (this.requestInProgress) return;
    const thePlayer = this.team!.players[index];
    this.removePlayer.emit(thePlayer);
  }

  transferCaptainHelper(index: number) {
    if (this.requestInProgress) return;
    const thePlayer = this.team!.players[index];
    this.transferCaptain.emit(thePlayer);
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoModule,
  ],
  declarations: [ TournamentTeamCard ],
  exports:      [ TournamentTeamCard ],
  bootstrap:    [ TournamentTeamCard ]
})
export class TournamentTeamCardModule {}