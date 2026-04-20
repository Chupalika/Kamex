import { Component, NgModule, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TournamentTeam, GameMode, TournamentPlayer } from '../../models/models';
import { TournamentPlayerCard } from './tournament_player_card';
import { HovercardModule } from 'src/app/components/hovercard';

@Component({
  selector: 'tournament-team-card',
  templateUrl: './tournament_team_card.html',
  styleUrls: ['./tournament_team_card.scss']
})
export class TournamentTeamCard {
  @Input() team?: TournamentTeam;
  @Input() gameMode?: GameMode;
  @Input() editable: boolean = false;
  @Input() mobileMode: boolean = false;
  @Input() playerFlagsToggle: boolean = false;

  @ViewChild('teamName') teameNameRef?: ElementRef;

  GameMode = GameMode;
  TournamentPlayerCard = TournamentPlayerCard;

  requestInProgress = false;

  constructor() {}

  get isNameOverflowing() {
    const theElement = this.teameNameRef?.nativeElement;
    return theElement ? theElement.scrollHeight > theElement.clientHeight : false;
  }

  removePlayer(index: number) {
    console.log(index);
  }

  getPlayerImage(player: TournamentPlayer) {
    if (this.playerFlagsToggle) {
      return 'https://flagcdn.com/w40/' + player.country.toLowerCase() + '.png';
    } else {
      return `https://a.ppy.sh/${player.playerId}`;
    }
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  declarations: [ TournamentTeamCard ],
  exports:      [ TournamentTeamCard ],
  bootstrap:    [ TournamentTeamCard ]
})
export class TournamentTeamCardModule {}