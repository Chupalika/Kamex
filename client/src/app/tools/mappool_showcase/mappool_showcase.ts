import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const MAPPOOL_SHOWCASE_SETTINGS_BACKGROUND = "mappool_showcase_settings_background";
const MAPPOOL_SHOWCASE_SETTINGS_FONT_COLOR = "mappool_showcase_settings_font_color";

const TOSU_URL = 'ws://127.0.0.1:24050/websocket/v2';

@Component({
  selector: 'mappool-showcase',
  template:
   `<div class="stream-area" [style]="{'background-image': 'url(' + background + ')', 'color': '#' + fontColor}">
      <div class="map-stats-container">
        <div class="inner-container">
          <div class="stats">
            <div class="artist-title">{{ artist }} - {{ title }}</div>
            <div class="mapper-diff">
              <span class="label">mapper</span><span class="value">{{ mapperName }}</span>
              <span class="label">difficulty</span><span class="value">{{ diffName }}</span>
            </div>
          </div>
        </div>
        <div class="inner-container">
          <div class="stats">
            <div class="top-row">
              <div class="stats-section">
                <div class="stats-subsection" *ngIf="gameMode === 'taiko' || gameMode === 'mania'">
                  OD <span class="value2">{{ od }}</span> / HP <span class="value2">{{ hp }}</span>
                </div>
                <div class="stats-subsection" *ngIf="gameMode !== 'taiko' && gameMode !== 'mania'">
                  CS <span class="value2">{{ cs }}</span> / AR <span class="value2">{{ ar }}</span> / OD <span class="value2">{{ od }}</span> / HP <span class="value2">{{ hp }}</span>
                </div>
                <div class="stats-subsection">Length <span class="value2">{{ length }}</span></div>
              </div>
            </div>
            <div class="bottom-row">
              <div class="stats-section">
                <div class="stats-subsection">Star Rating <span class="value2">{{ sr }}</span></div>
                <div class="stats-subsection">BPM <span class="value2">{{ bpm }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="control-area">
      <form [formGroup]="settingsForm" (ngSubmit)="updateSettings()" class="settings-form" autocomplete="off">
        <mat-form-field>
          <mat-label>Background URL</mat-label>
          <input matInput type="text" formControlName="background">
        </mat-form-field>
        <mat-form-field>
          <mat-label>Font Color</mat-label>
          <input matInput type="text" formControlName="fontColor">
        </mat-form-field>
        <button mat-raised-button class="update-button" type="submit" color="primary" [disabled]="!settingsForm.valid || !settingsHasChanges()">Update</button>
      </form>
    </div>`,
  styles:
   `.stream-area { font-family: "Red Hat Display"; display: flex; width: 1600px; height: 900px; background-size: cover; }
    .map-stats-container { display: flex; position: relative; top: 830px; width: 100%; height: 70px; font-size: 14px; font-weight: bold; }
    .inner-container { width: 50%; }
    .stats { position: relative; left: 28px; top: 14px; display: flex; flex-direction: column; }
    .stats-section { display: flex; }
    .stats-subsection { width: 35%; font-weight: normal; }
    .label { font-weight: normal; margin-right: 6px; }
    .value { margin-right: 24px; }
    .value2 { font-weight: bold; }
    .control-area { font-family: "Red Hat Display"; display: flex; padding-top: 10px; font-size: 24px; }
    .settings-form { mat-form-field { margin-right: 20px; width: 160px; } .update-button { margin: 10px; } }`,
})
export class MappoolShowcase {
  webSocket?: WebSocket;
  tosuConnected = false;
  data?: any;
  background = "";
  fontColor = "ffffff";

  settingsForm: FormGroup;
  backgroundFormControl: FormControl;
  fontColorFormControl: FormControl;

  constructor() {
    this.backgroundFormControl =  new FormControl("");
    this.fontColorFormControl = new FormControl("");

    this.settingsForm = new FormGroup({
      background: this.backgroundFormControl,
      fontColor: this.fontColorFormControl,
    });
  }

  ngOnInit() {
    this.setupWebSocket();
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

  refreshSettings() {
    this.backgroundFormControl.setValue(localStorage.getItem(MAPPOOL_SHOWCASE_SETTINGS_BACKGROUND) ?? "");
    this.fontColorFormControl.setValue(localStorage.getItem(MAPPOOL_SHOWCASE_SETTINGS_FONT_COLOR) ?? "ffffff");
    this.background = this.backgroundFormControl.value;
    this.fontColor = this.fontColorFormControl.value;
  }

  settingsHasChanges() {
    return this.background !== this.backgroundFormControl.value || this.fontColor !== this.fontColorFormControl.value;
  }

  updateSettings() {
    localStorage.setItem(MAPPOOL_SHOWCASE_SETTINGS_BACKGROUND, this.backgroundFormControl.value);
    localStorage.setItem(MAPPOOL_SHOWCASE_SETTINGS_FONT_COLOR, this.fontColorFormControl.value);
    this.refreshSettings();
  }

  get gameMode() {
    return this.data?.beatmap?.mode.name;
  }

  get artist() {
    return this.data?.beatmap?.artist ?? "unknown";
  }

  get title() {
    return this.data?.beatmap?.title ?? "unknown";
  }

  get diffName() {
    return this.data?.beatmap?.version ?? "unknown";
  }

  get mapperName() {
    return this.data?.beatmap?.mapper ?? "unknown";
  }

  get cs() {
    return this.data?.beatmap?.stats.cs.converted ?? "unknown";
  }

  get ar() {
    return this.data?.beatmap?.stats.ar.converted ?? "unknown";
  }

  get od() {
    return this.data?.beatmap?.stats.od.converted ?? "unknown";
  }

  get hp() {
    return this.data?.beatmap?.stats.hp.converted ?? "unknown";
  }

  get length() {
    if (this.data?.beatmap === undefined) return "unknown";
    let ms = this.data.beatmap.time.lastObject - this.data.beatmap.time.firstObject;
    if (this.dtEnabled) ms /= 1.5;
    return `${Math.floor(ms / 60000)}:${String(ms % 60000).slice(0, 2)}`;
  }

  get sr() {
    return this.data?.beatmap?.stats.stars.total ?? "unknown";
  }

  get bpm() {
    if (this.data?.beatmap === undefined) return "unknown";
    if (this.data.beatmap.stats.bpm.min.toFixed() !== this.data.beatmap.stats.bpm.max.toFixed()) {
      return `${this.data.beatmap.stats.bpm.min.toFixed()} - ${this.data.beatmap.stats.bpm.max.toFixed()} (${this.data.beatmap.stats.bpm.common.toFixed()})`;
    } else return this.data.beatmap.stats.bpm.common.toFixed();
  }

  get dtEnabled() {
    const mods = this.data?.play.mods.array.map((mod: any) => mod.acronym) || [];
    return mods.includes("DT") || mods.includes("NC");
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  declarations: [ MappoolShowcase ],
  exports:      [ MappoolShowcase ],
  bootstrap:    [ MappoolShowcase ]
})
export class MappoolShowcaseModule {}