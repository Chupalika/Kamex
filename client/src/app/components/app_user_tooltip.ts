import { CommonModule } from '@angular/common';
import { Component, Input, NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppUser } from '../models/models';

@Component({
  selector: 'app-user-tooltip',
  templateUrl: './app_user_tooltip.html',
  styleUrls: ['./app_user_tooltip.scss']
})
export class AppUserTooltip {
  @Input() appUser?: AppUser;
  @Input() osuId?: number;

  copyPlayerId() {
    navigator.clipboard.writeText(this.appUser!.osuId.toString());
  }

  get href() {
    return `https://osu.ppy.sh/u/${ this.appUser?.osuId ?? this.osuId }`;
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
  ],
  declarations: [ AppUserTooltip ],
  exports:      [ AppUserTooltip ],
  bootstrap:    [ AppUserTooltip ]
})
export class AppUserTooltipModule {}