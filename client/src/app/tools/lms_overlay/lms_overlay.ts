import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgModule, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

const LMS_OVERLAY_SETTINGS_BACKGROUND = "lms_overlay_settings_background";
const LMS_OVERLAY_SETTINGS_TITLE = "lms_overlay_settings_title";
const LMS_OVERLAY_SETTINGS_FONT_COLOR = "lms_overlay_settings_font_color";
const LMS_OVERLAY_SETTINGS_TOURNAMENT_ACRONYM = "lms_overlay_settings_tournament_acronym";
const LMS_OVERLAY_SETTINGS_CHAT_BOX = "lms_overlay_settings_chat_box";
const LMS_OVERLAY_SETTINGS_COMPETITORS = "lms_overlay_settings_competitors";
const LMS_OVERLAY_SETTINGS_PICKS = "lms_overlay_settings_picks";

const TOSU_URL = 'ws://127.0.0.1:24050/websocket/v2';
const PLAYER_CARD_HEIGHT = 92;
const DEFAULT_CHAT_BOX_SETTINGS = {
  xpos: 340,
  ypos: 255,
  width: 340,
  height: 255,
  playerColor: "acf0fd",
  banchoColor: "ff8993",
  otherColor: "c3c300",
  backgroundColor: "000000",
};

interface Competitor {
  playerId: number;
  username: string;
  lives: number;
}

interface Pick {
  beatmapId: number;
  label: string;
}

interface ChatBoxSettings {
  xpos: number;
  ypos: number;
  width: number;
  height: number;
  playerColor: string;
  banchoColor: string;
  otherColor: string;
  backgroundColor: string;
}

interface ChatMessage {
  username: string;
  type: string;
  time: string;
  message: string;
}

@Component({
  selector: 'lms-overlay',
  templateUrl: './lms_overlay.html',
  styleUrls: ['./lms_overlay.scss']
})
export class LMSOverlay implements OnInit {
  webSocket?: WebSocket;
  tosuConnected = false;
  data?: any;
  background = "";
  title = "";
  tournamentAcronym = "";
  fontColor = "ffffff";
  chatBoxSettings: ChatBoxSettings = DEFAULT_CHAT_BOX_SETTINGS;
  competitors: Competitor[] = [];
  picks: Pick[] = [];

  settingsForm: FormGroup;
  backgroundFormControl: FormControl;
  titleFormControl: FormControl;
  fontColorFormControl: FormControl;
  tournamentAcronymFormControl: FormControl;
  chatBoxFormGroup: FormGroup;
  chatBoxXposFormControl: FormControl;
  chatBoxYposFormControl: FormControl;
  chatBoxWidthFormControl: FormControl;
  chatBoxHeightFormControl: FormControl;
  chatBoxPlayerColorFormControl: FormControl;
  chatBoxBanchoColorFormControl: FormControl;
  chatBoxOtherColorFormControl: FormControl;
  chatBoxBackgroundColorFormControl: FormControl;
  competitorsFormControl: FormArray;
  picksFormControl: FormArray;

  tourneyClients = new Map();
  competitorPositions: number[] = [];
  previousIpcState = 0;
  chatMessages: ChatMessage[] = [];

  @ViewChild("chatBox") chatBoxRef?: ElementRef;

  constructor() {
    this.backgroundFormControl =  new FormControl("");
    this.titleFormControl = new FormControl("");
    this.fontColorFormControl = new FormControl("");
    this.tournamentAcronymFormControl = new FormControl("");
    this.competitorsFormControl = new FormArray<FormControl>([]);
    this.picksFormControl = new FormArray<FormControl>([]);

    this.chatBoxXposFormControl = new FormControl(0);
    this.chatBoxYposFormControl = new FormControl(0);
    this.chatBoxWidthFormControl = new FormControl(0);
    this.chatBoxHeightFormControl = new FormControl(0);
    this.chatBoxPlayerColorFormControl = new FormControl("");
    this.chatBoxBanchoColorFormControl = new FormControl("");
    this.chatBoxOtherColorFormControl = new FormControl("");
    this.chatBoxBackgroundColorFormControl = new FormControl("");
    this.chatBoxFormGroup = new FormGroup({
      xpos: this.chatBoxXposFormControl,
      ypos: this.chatBoxYposFormControl,
      width: this.chatBoxWidthFormControl,
      height: this.chatBoxHeightFormControl,
      playerColor: this.chatBoxPlayerColorFormControl,
      banchoColor: this.chatBoxBanchoColorFormControl,
      otherColor: this.chatBoxOtherColorFormControl,
      backgroundColor: this.chatBoxBackgroundColorFormControl,
    })

    this.settingsForm = new FormGroup({
      background: this.backgroundFormControl,
      title: this.titleFormControl,
      fontColor: this.fontColorFormControl,
      tournamentAcronym: this.tournamentAcronymFormControl,
      chatBox: this.chatBoxFormGroup,
      competitors: this.competitorsFormControl,
      picks: this.picksFormControl,
    });
  }
  
  ngOnInit() {
    this.setupWebSocket();
    this.refreshSettings();
    this.updateCompetitorPositions();
  }

  setupWebSocket() {
    this.webSocket = new WebSocket(TOSU_URL);

    this.webSocket.onopen = (event) => {
      this.tosuConnected = true;
      console.log("Connected to Tosu");
    };

    this.webSocket.onmessage = (event) => {
      this.data = JSON.parse(event.data);
      //console.log(this.data);
      
      this.updateTourneyClients();
      this.updateCompetitorPositions();

      // upon map completion, auto subtract a life from the lowest scoring alive player
      if (this.previousIpcState == 3 && this.data.tourney.ipcState == 4 && this.picks.map((pick) => pick.beatmapId).includes(this.data.beatmap.id)) {
        for (let playerId of [...this.competitorPositions].reverse()) {
          const competitor = this.competitors.find((competitor) => competitor.playerId == playerId);
          if (competitor && competitor.lives > 0) {
            const competitorFormGroup = this.getCompetitorsFormGroups().find((x)=> x.value.playerId === competitor.playerId);
            competitorFormGroup?.controls["lives"].setValue(competitor.lives - 1);
            break;
          }
        }
      }
      this.previousIpcState = this.data.tourney.ipcState;

      const lobbyChat = this.data.tourney.chat;
      for (let i = this.chatMessages.length; i < lobbyChat.length; i++) {
        const newChatMessage = lobbyChat[i];
        let type = "other";
        if (this.competitors.map((competitor) => competitor.username).includes(newChatMessage.name)) type = "player";
        if (newChatMessage.name == "BanchoBot") type = "bancho";
        this.chatMessages.push({
          username: newChatMessage.name,
          type,
          time: newChatMessage.time,
          message: newChatMessage.message,
        });
        // auto scroll to bottom of chat box after new message
        if (this.chatBoxRef) {
          this.chatBoxRef.nativeElement.scroll(0, this.chatBoxRef.nativeElement.scrollHeight);
        }
      }
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

  updateTourneyClients() {
    this.tourneyClients.clear();
    for (let client of this.data.tourney.clients) {
      if (!client.user.id) continue;
      this.tourneyClients.set(client.user.id, {
        score: client.play.score,
        mods: client.play.mods.array.map((mod: any) => mod.acronym),
        countOk: client.play.hits["100"],
        countMiss: client.play.hits["0"],
      });
    }
  }

  updateCompetitorPositions() {
    const ans = [...this.competitors];
    ans.sort((a, b) => {
      const aStatus = this.tourneyClients.get(a.playerId);
      const bStatus = this.tourneyClients.get(b.playerId);
      return (bStatus?.score ?? 0) - (aStatus?.score ?? 0);
    });
    this.competitorPositions = ans.map((competitor) => competitor.playerId);
  }

  refreshSettings() {
    this.backgroundFormControl.setValue(localStorage.getItem(LMS_OVERLAY_SETTINGS_BACKGROUND) ?? "");
    this.titleFormControl.setValue(localStorage.getItem(LMS_OVERLAY_SETTINGS_TITLE) ?? "");
    this.fontColorFormControl.setValue(localStorage.getItem(LMS_OVERLAY_SETTINGS_FONT_COLOR) ?? "ffffff");
    this.tournamentAcronymFormControl.setValue(localStorage.getItem(LMS_OVERLAY_SETTINGS_TOURNAMENT_ACRONYM) ?? "");
    this.chatBoxFormGroup.setValue(JSON.parse(localStorage.getItem(LMS_OVERLAY_SETTINGS_CHAT_BOX) ?? JSON.stringify(DEFAULT_CHAT_BOX_SETTINGS)));
    this.getCompetitorsFormArray().clear();
    for (let competitor of (JSON.parse(localStorage.getItem(LMS_OVERLAY_SETTINGS_COMPETITORS) ?? "[]") ?? [])) {
      this.addCompetitor(competitor.playerId, competitor.username, competitor.lives);
    }
    this.getPicksFormArray().clear();
    for (let pick of (JSON.parse(localStorage.getItem(LMS_OVERLAY_SETTINGS_PICKS) ?? "[]") ?? [])) {
      this.addPick(pick.beatmapId, pick.label);
    }

    this.background = this.backgroundFormControl.value;
    this.title = this.titleFormControl.value;
    this.fontColor = this.fontColorFormControl.value;
    this.tournamentAcronym = this.tournamentAcronymFormControl.value;
    this.chatBoxSettings = this.chatBoxFormGroup.value;
    this.competitors = this.competitorsFormControl.value;
    this.picks = this.picksFormControl.value;
  }

  settingsHasChanges() {
    return this.background !== this.backgroundFormControl.value ||
      this.title !== this.titleFormControl.value ||
      this.fontColor !== this.fontColorFormControl.value ||
      this.tournamentAcronym !== this.tournamentAcronymFormControl.value ||
      JSON.stringify(this.chatBoxSettings) !== JSON.stringify(this.chatBoxFormGroup.value) ||
      JSON.stringify(this.competitors) !== JSON.stringify(this.competitorsFormControl.value) ||
      JSON.stringify(this.picks) !== JSON.stringify(this.picksFormControl.value);
  }

  updateSettings() {
    localStorage.setItem(LMS_OVERLAY_SETTINGS_BACKGROUND, this.backgroundFormControl.value);
    localStorage.setItem(LMS_OVERLAY_SETTINGS_TITLE, this.titleFormControl.value);
    localStorage.setItem(LMS_OVERLAY_SETTINGS_FONT_COLOR, this.fontColorFormControl.value);
    localStorage.setItem(LMS_OVERLAY_SETTINGS_TOURNAMENT_ACRONYM, this.tournamentAcronymFormControl.value);
    localStorage.setItem(LMS_OVERLAY_SETTINGS_CHAT_BOX, JSON.stringify(this.chatBoxFormGroup.value));
    localStorage.setItem(LMS_OVERLAY_SETTINGS_COMPETITORS, JSON.stringify(this.competitorsFormControl.value));
    localStorage.setItem(LMS_OVERLAY_SETTINGS_PICKS, JSON.stringify(this.picksFormControl.value));
    this.refreshSettings();
  }

  getCompetitorsFormArray(): FormArray {
    return this.settingsForm.controls["competitors"] as FormArray;
  }

  getCompetitorsFormGroups(): FormGroup[] {
    return this.getCompetitorsFormArray().controls as FormGroup[];
  }

  addCompetitor(playerId = "", username = "", lives = 0) {
    const competitorPlayerIdFormControl = new FormControl(playerId);
    const competitorUsernameFormControl = new FormControl(username);
    const competitorLivesFormControl = new FormControl(lives);
    const competitorForm = new FormGroup({
      playerId: competitorPlayerIdFormControl,
      username: competitorUsernameFormControl,
      lives: competitorLivesFormControl,
    });
    this.getCompetitorsFormArray().push(competitorForm);
  }

  deleteCompetitor(index: number) {
    this.getCompetitorsFormArray().removeAt(index);
  }

  getPicksFormArray(): FormArray {
    return this.settingsForm.controls["picks"] as FormArray;
  }

  getPicksFormGroups(): FormGroup[] {
    return this.getPicksFormArray().controls as FormGroup[];
  }

  addPick(beatmapId = "", label = "") {
    const pickBeatmapIdFormControl = new FormControl(beatmapId);
    const pickLabelFormControl = new FormControl(label);
    const pickForm = new FormGroup({
      beatmapId: pickBeatmapIdFormControl,
      label: pickLabelFormControl,
    });
    this.getPicksFormArray().push(pickForm);
  }

  getCurrentPick() {
    const thePick = this.picks.find((pick) => pick.beatmapId === this.data?.beatmap.id);
    return thePick?.label ?? "";
  }

  deletePick(index: number) {
    this.getPicksFormArray().removeAt(index);
  }

  mapMetadata() {
    if (this.data) {
      return `${this.data.beatmap.artist} - ${this.data.beatmap.title} [${this.data.beatmap.version}] (${this.data.beatmap.mapper})`;
    } else return "";
  }

  mapStats() {
    if (this.data) {
      const minutes = Math.floor(this.data.beatmap.time.lastObject / 60000);
      const seconds = Math.floor(this.data.beatmap.time.lastObject % 60000 / 1000);
      const minBpm = this.data.beatmap.stats.bpm.min;
      const maxBpm = this.data.beatmap.stats.bpm.max;
      const bpm = minBpm == maxBpm ? minBpm : `${minBpm} - ${maxBpm}`;
      return `${this.data.beatmap.stats.stars.total}☆ | ${minutes}:${("00" + seconds).slice(-2)} | ${bpm} BPM | OD${this.data.beatmap.stats.od.original}`;
    } else return "";
  }

  getModIcon(mod: string) {
    return `./assets/${this.tournamentAcronym ? this.tournamentAcronym : 'default'}/mods/${mod}.png`;
  }

  getHeartIcon() {
    return `./assets/${this.tournamentAcronym ? this.tournamentAcronym : 'default'}/heart.png`;
  }

  getCompetitorPosition(playerId: number) {
    return `${this.competitorPositions.indexOf(playerId) * PLAYER_CARD_HEIGHT}px`;
  }

  // fetch from active form value instead of saved values
  getCompetitorLives(index: number) {
    return this.getCompetitorsFormArray().at(index)?.value?.lives ?? 0;
  }

  // ipcState: 1 means idle, 3 means playing, and 4 means result screen
  isPlaying() {
    return this.data?.tourney.ipcState === 3;
    // return [3, 4].includes(this.data?.tourney.ipcState);
  }

  isOnResultScreen() {
    return this.data?.tourney.ipcState === 4;
  }

  getChatPrefixColor(message: ChatMessage) {
    if (message.type === "player") return this.chatBoxSettings.playerColor;
    if (message.type === "bancho") return this.chatBoxSettings.banchoColor;
    return this.chatBoxSettings.otherColor;
  }
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  declarations: [ LMSOverlay ],
  exports: [ LMSOverlay ],
  bootstrap: [ LMSOverlay ]
})
export class LMSOverlayModule {}