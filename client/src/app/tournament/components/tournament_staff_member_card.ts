import { Component, NgModule, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppUserTooltip } from '../../components/app_user_tooltip';
import { HovercardModule } from '../../components/hovercard';
import { TournamentStaffMember } from '../../models/models';

@Component({
  selector: 'tournament-staff-member-card',
  templateUrl: './tournament_staff_member_card.html',
  styleUrls: ['./tournament_staff_member_card.scss']
})
export class TournamentStaffMemberCard {
  @Input() staffMember?: TournamentStaffMember;
  @Input() mobileMode: boolean = false;

  AppUserTooltip = AppUserTooltip;

  constructor() {}

  get roles(): string {
    return this.staffMember?.roles.map((role) => role.name).join(", ") ?? "";
  }

  copyPlayerId() {
    navigator.clipboard.writeText(this.staffMember!.playerId.toString());
  }
}

@NgModule({
  imports: [
    CommonModule,
    HovercardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  declarations: [ TournamentStaffMemberCard ],
  exports:      [ TournamentStaffMemberCard ],
  bootstrap:    [ TournamentStaffMemberCard ]
})
export class TournamentStaffMemberCardModule {}