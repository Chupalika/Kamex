import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const TOSU_URL = 'ws://127.0.0.1:24050/websocket/v2';
const TTF_OVERLAY_SETTINGS_POINT_ICON = "ttf_overlay_settings_point_icon";
const TTF_OVERLAY_SETTINGS_CARD1_RED_ACTIVE_ICON = "ttf_overlay_settings_card1_red_active_icon";
const TTF_OVERLAY_SETTINGS_CARD2_RED_ACTIVE_ICON = "ttf_overlay_settings_card2_red_active_icon";
const TTF_OVERLAY_SETTINGS_CARD1_BLUE_ACTIVE_ICON = "ttf_overlay_settings_card1_blue_active_icon";
const TTF_OVERLAY_SETTINGS_CARD2_BLUE_ACTIVE_ICON = "ttf_overlay_settings_card2_blue_active_icon";
const TTF_OVERLAY_SETTINGS_CARD1_INACTIVE_ICON = "ttf_overlay_settings_card1_inactive_icon";
const TTF_OVERLAY_SETTINGS_CARD2_INACTIVE_ICON = "ttf_overlay_settings_card2_inactive_icon";

interface TTFPlayer {
  username: string;
  points: number;
  isActive: boolean;
}

interface TTFCard {
  isActive: boolean;
  activeIcon: () => string;
  inactiveIcon: () => string;
  name: string;
}

interface TourneyClient {
  count100: number;
  countMiss: number;
}

@Component({
  selector: 'ttf_overlay',
  templateUrl: './ttf_overlay.html',
  styleUrls: ['./ttf_overlay.scss']
})
export class TTFOverlay implements OnInit {
  webSocket?: WebSocket;
  tosuConnected = false;
  data?: any;
  playersPerTeam = 4;
  maxPlayerPoints = 7;
  numClients = 4;
  pointsArray: string[] = [];
  redTeamPlayers: TTFPlayer[] = [];
  blueTeamPlayers: TTFPlayer[] = [];
  redTeamCards: TTFCard[] = [];
  blueTeamCards: TTFCard[] = [];
  enableHitsOverlay: boolean = true;
  enablePointsOverlay: boolean = true;
  pointIcon: string = "";
  card1RedActiveIcon: string = "";
  card2RedActiveIcon: string = "";
  card1BlueActiveIcon: string = "";
  card2BlueActiveIcon: string = "";
  card1InactiveIcon: string = "";
  card2InactiveIcon: string = "";

  settingsForm: FormGroup;
  pointIconFormControl: FormControl;
  card1RedActiveIconFormControl: FormControl;
  card2RedActiveIconFormControl: FormControl;
  card1BlueActiveIconFormControl: FormControl;
  card2BlueActiveIconFormControl: FormControl;
  card1InactiveIconFormControl: FormControl;
  card2InactiveIconFormControl: FormControl;

  tourneyClients: TourneyClient[] = [];
  previousIpcState = 0;

  constructor() {
    this.pointIconFormControl = new FormControl("");
    this.card1RedActiveIconFormControl = new FormControl("");
    this.card2RedActiveIconFormControl = new FormControl("");
    this.card1BlueActiveIconFormControl = new FormControl("");
    this.card2BlueActiveIconFormControl = new FormControl("");
    this.card1InactiveIconFormControl = new FormControl("");
    this.card2InactiveIconFormControl = new FormControl("");

    this.settingsForm = new FormGroup({
      pointIcon: this.pointIconFormControl,
      card1RedActiveIcon: this.card1RedActiveIconFormControl,
      card2RedActiveIcon: this.card2RedActiveIconFormControl,
      card1BlueActiveIcon: this.card1BlueActiveIconFormControl,
      card2BlueActiveIcon: this.card2BlueActiveIconFormControl,
      card1InactiveIcon: this.card1InactiveIconFormControl,
      card2InactiveIcon: this.card2InactiveIconFormControl,
    });

    for (let i = 0; i < this.playersPerTeam; i++) {
      this.redTeamPlayers.push({ username: "", points: 0, isActive: false });
      this.blueTeamPlayers.push({ username: "", points: 0, isActive: false });
    }
    for (let i = 0; i < this.numClients; i++) {
      this.tourneyClients.push({ count100: 0, countMiss: 0 });
    }
    for (let i = 0; i < this.maxPlayerPoints; i++) {
      this.pointsArray.push("");
    }
    this.redTeamCards.push({ isActive: true, activeIcon: () => this.card1RedActiveIcon, inactiveIcon: () => this.card1InactiveIcon, name: "Lock" });
    this.redTeamCards.push({ isActive: true, activeIcon: () => this.card2RedActiveIcon, inactiveIcon: () => this.card2InactiveIcon, name: "Swap" });
    this.blueTeamCards.push({ isActive: true, activeIcon: () => this.card2BlueActiveIcon, inactiveIcon: () => this.card2InactiveIcon, name: "Swap" });
    this.blueTeamCards.push({ isActive: true, activeIcon: () => this.card1BlueActiveIcon, inactiveIcon: () => this.card1InactiveIcon, name: "Lock" });
  }
  
  ngOnInit() {
    this.setupWebSocket();
    this.refreshSettings();
  }

  refreshSettings() {
    this.pointIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_POINT_ICON) ?? "");
    if (this.pointIconFormControl.value) this.pointIcon = this.pointIconFormControl.value;
    this.card1RedActiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD1_RED_ACTIVE_ICON) ?? "");
    if (this.card1RedActiveIconFormControl.value) this.card1RedActiveIcon = this.card1RedActiveIconFormControl.value;
    this.card2RedActiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD2_RED_ACTIVE_ICON) ?? "");
    if (this.card2RedActiveIconFormControl.value) this.card2RedActiveIcon = this.card2RedActiveIconFormControl.value;
    this.card1BlueActiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD1_BLUE_ACTIVE_ICON) ?? "");
    if (this.card1BlueActiveIconFormControl.value) this.card1BlueActiveIcon = this.card1BlueActiveIconFormControl.value;
    this.card2BlueActiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD2_BLUE_ACTIVE_ICON) ?? "");
    if (this.card2BlueActiveIconFormControl.value) this.card2BlueActiveIcon = this.card2BlueActiveIconFormControl.value;
    this.card1InactiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD1_INACTIVE_ICON) ?? "");
    if (this.card1InactiveIconFormControl.value) this.card1InactiveIcon = this.card1InactiveIconFormControl.value;
    this.card2InactiveIconFormControl.setValue(localStorage.getItem(TTF_OVERLAY_SETTINGS_CARD2_INACTIVE_ICON) ?? "");
    if (this.card2InactiveIconFormControl.value) this.card2InactiveIcon = this.card2InactiveIconFormControl.value;
  }

  settingsHasChanges() {
    return this.pointIcon !== this.pointIconFormControl.value ||
        this.card1RedActiveIcon !== this.card1RedActiveIconFormControl.value ||
        this.card2RedActiveIcon !== this.card2RedActiveIconFormControl.value ||
        this.card1BlueActiveIcon !== this.card1BlueActiveIconFormControl.value ||
        this.card2BlueActiveIcon !== this.card2BlueActiveIconFormControl.value ||
        this.card1InactiveIcon !== this.card1InactiveIconFormControl.value ||
        this.card2InactiveIcon !== this.card2InactiveIconFormControl.value;
  }

  updateSettings() {
    localStorage.setItem(TTF_OVERLAY_SETTINGS_POINT_ICON, this.pointIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD1_RED_ACTIVE_ICON, this.card1RedActiveIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD2_RED_ACTIVE_ICON, this.card2RedActiveIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD1_BLUE_ACTIVE_ICON, this.card1BlueActiveIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD2_BLUE_ACTIVE_ICON, this.card2BlueActiveIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD1_INACTIVE_ICON, this.card1InactiveIconFormControl.value);
    localStorage.setItem(TTF_OVERLAY_SETTINGS_CARD2_INACTIVE_ICON, this.card2InactiveIconFormControl.value);
    this.refreshSettings();
  }

  setupWebSocket() {
    this.webSocket = new WebSocket(TOSU_URL);

    this.webSocket.onopen = (event) => {
      this.tosuConnected = true;
      console.log("Connected to Tosu");
    };

    this.webSocket.onmessage = (event) => {
      this.data = JSON.parse(event.data);
      const activePlayerNames: string[] = this.data.tourney.clients.map((x: any) => x.user.name);
      const redTeamActivePlayers = this.redTeamPlayers.filter((player) => activePlayerNames.includes(player.username));
      const blueTeamActivePlayers = this.blueTeamPlayers.filter((player) => activePlayerNames.includes(player.username));
      for (let redPlayer of this.redTeamPlayers) {
        redPlayer.isActive = activePlayerNames.includes(redPlayer.username);
      }
      for (let bluePlayer of this.blueTeamPlayers) {
        bluePlayer.isActive = activePlayerNames.includes(bluePlayer.username);
      }

      this.data.tourney.clients.forEach((client: any, index: number) => {
        if (index < this.tourneyClients.length) {
          this.tourneyClients[index].count100 = client.play.hits["100"];
          this.tourneyClients[index].countMiss = client.play.hits["0"];
        }
      });

      // upon map completion, auto subtract a life from the lowest scoring alive player
      if (this.previousIpcState == 3 && this.data.tourney.ipcState == 4) {
        const redTeamScore = this.data.tourney.totalScore.left;
        const blueTeamScore = this.data.tourney.totalScore.right;
        if (redTeamScore > blueTeamScore) {
          for (let redTeamActivePlayer of redTeamActivePlayers) {
            this.subtractPoint(redTeamActivePlayer);
          }
        } else if (blueTeamScore > redTeamScore) {
          for (let blueTeamActivePlayer of blueTeamActivePlayers) {
            this.subtractPoint(blueTeamActivePlayer);
          }
        }
      }
      this.previousIpcState = this.data.tourney.ipcState;
    };

    this.webSocket.onerror = (event) => {
      console.log("WebSocket error");
    }

    this.webSocket.onclose = (event) => {
      this.tosuConnected = false;
      console.log("Tosu is disconnected, reconnecting in 5 seconds");
      setTimeout(() => this.setupWebSocket(), 5000);
    };
  }

  // ipcState: 1 means idle, 3 means playing, and 4 means result screen
  get isPlaying() {
    return this.data?.tourney.ipcState === 3;
  }

  isOnResultScreen() {
    return this.data?.tourney.ipcState === 4;
  }

  addPoint(player: TTFPlayer) {
    if (player.points < this.maxPlayerPoints) {
      player.points++;
    }
  }

  subtractPoint(player: TTFPlayer) {
    if (player.points > 0) {
      player.points--;
    }
  }

  changeName(player: TTFPlayer, event: any) {
    player.username = event.target.value;
  }

  getHitOverlayClass(clientIndex: number): string {
    return `client${clientIndex}-hits-overlay` + (this.isPlaying ? "" : " hide");
  }

  shouldHideRedPoint(player: TTFPlayer, i: number) {
    return i+1 > player.points;
  }

  shouldHideBluePoint(player: TTFPlayer, i: number) {
    return this.maxPlayerPoints - i > player.points;
  }
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  declarations: [ TTFOverlay ],
  exports: [ TTFOverlay ],
  bootstrap: [ TTFOverlay ]
})
export class TTFOverlayModule {}