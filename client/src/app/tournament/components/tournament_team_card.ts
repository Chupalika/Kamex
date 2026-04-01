import { Component, NgModule, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TournamentTeam, GameMode } from '../../models/models';
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