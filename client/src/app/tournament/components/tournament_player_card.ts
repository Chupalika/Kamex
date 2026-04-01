import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppUserTooltip } from '../../components/app_user_tooltip';
import { HovercardModule } from '../../components/hovercard';
import { TournamentPlayer, GameMode, TournamentTeam } from '../../models/models';
import { TournamentTeamCard } from './tournament_team_card';

@Component({
  selector: 'tournament-player-card',
  templateUrl: './tournament_player_card.html',
  styleUrls: ['./tournament_player_card.scss']
})
export class TournamentPlayerCard {
  @Input() player?: TournamentPlayer;
  @Input() teams: TournamentTeam[] = [];
  @Input() gameMode?: GameMode;
  @Input() mobileMode: boolean = false;

  GameMode = GameMode;
  AppUserTooltip = AppUserTooltip;
  TournamentTeamCard = TournamentTeamCard;

  constructor() {}
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  declarations: [ TournamentPlayerCard ],
  exports:      [ TournamentPlayerCard ],
  bootstrap:    [ TournamentPlayerCard ]
})
export class TournamentPlayerCardModule {}