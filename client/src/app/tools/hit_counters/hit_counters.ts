import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

const HIT_COUNTERS_SETTINGS_TRANSFORM_X = "hit_counters_settings_transform_x";
const HIT_COUNTERS_SETTINGS_TRANSFORM_Y = "hit_counters_settings_transform_y";
const HIT_COUNTERS_SETTINGS_HIT_FONT_SIZE = "hit_counters_settings_hit_font_size";
const HIT_COUNTERS_SETTINGS_LABEL_FONT_SIZE = "hit_counters_settings_label_font_size";
const HIT_COUNTERS_SETTINGS_FONT_NAME = "hit_counters_settings_font_name";
const HIT_COUNTERS_SETTINGS_FONT_COLOR_OK = "hit_counters_settings_font_color_ok";
const HIT_COUNTERS_SETTINGS_FONT_COLOR_MEH = "hit_counters_settings_font_color_meh";
const HIT_COUNTERS_SETTINGS_FONT_COLOR_MISS = "hit_counters_settings_font_color_miss";

const TOSU_URL = 'ws://127.0.0.1:24050/websocket/v2';

interface Client {
  top: number;
  left: number;
  hitFontSize: number;
  labelFontSize: number;
  gameMode: number;
  countOk: number;
  countMeh: number;
  countMiss: number;
  visible: boolean;
}

@Component({
  selector: 'hit-counters',
  template:
   `<div class="stream-area" [style.font-family]="fontName">
      <div
        *ngFor="let client of clients"
        class="client-hits-overlay"
        [ngClass]="{'hide': data?.tourney.ipcState !== 3 || !client.visible}"
        [style.top.px]="client.top"
        [style.left.px]="client.left"
      >
        <div class="hits">
          <div class="hit ok" [class.disable]="[2].includes(client.gameMode)" [style.color]="fontColorOk">
            <p class="counter-count" [style.font-size.px]="client.hitFontSize">{{ client.countOk }}</p>
            <p class="counter-label" [style.font-size.px]="client.labelFontSize">OK</p>
          </div>
          <div class="hit meh" [class.disable]="[1,2].includes(client.gameMode)" [style.color]="fontColorMeh">
            <p class="counter-count" [style.font-size.px]="client.hitFontSize">{{ client.countMeh }}</p>
            <p class="counter-label" [style.font-size.px]="client.labelFontSize">MEH</p>
          </div>
          <div class="hit miss" [style.color]="fontColorMiss">
            <p class="counter-count" [style.font-size.px]="client.hitFontSize">{{ client.countMiss }}</p>
            <p class="counter-label" [style.font-size.px]="client.labelFontSize">MISS</p>
          </div>
        </div>
      </div>
    </div>
    <div class="control-area">
      <div *ngFor="let client of clients; let i = index">
        <mat-slide-toggle (change)="toggleClientVisibility(i)">Hide Client {{ i }}</mat-slide-toggle>
      </div>
      <form [formGroup]="settingsForm" (ngSubmit)="updateSettings()" class="settings-form" autocomplete="off">
        <div class="mat-body-1 settings-header">
          Settings
          <mat-icon class="info-icon" matTooltip="Saved in browser local storage">info</mat-icon>
        </div>
        <div class="settings-row">
          <mat-form-field>
            <mat-label>Transform X</mat-label>
            <input matInput type="text" formControlName="transformX">
          </mat-form-field>
          <mat-form-field>
            <mat-label>Transform Y</mat-label>
            <input matInput type="text" formControlName="transformY">
          </mat-form-field>
          <mat-form-field>
            <mat-label>Hit Font Size <mat-icon class="info-icon" matTooltip="0 for default">info</mat-icon></mat-label>
            <input matInput type="text" formControlName="hitFontSize">
          </mat-form-field>
          <mat-form-field>
            <mat-label>Label Font Size <mat-icon class="info-icon" matTooltip="0 for default">info</mat-icon></mat-label>
            <input matInput type="text" formControlName="labelFontSize">
          </mat-form-field>
        </div>
        <div class="settings-row">
          <mat-form-field>
            <mat-label>Font Name <mat-icon class="info-icon" matTooltip="Should be available on Google Fonts">info</mat-icon></mat-label>
            <input matInput type="text" formControlName="fontName">
          </mat-form-field>
          <mat-form-field>
            <mat-label>OK Color</mat-label>
            <input matInput type="text" formControlName="fontColorOk">
          </mat-form-field>
          <mat-form-field>
            <mat-label>MEH Color</mat-label>
            <input matInput type="text" formControlName="fontColorMeh">
          </mat-form-field>
          <mat-form-field>
            <mat-label>MISS Color</mat-label>
            <input matInput type="text" formControlName="fontColorMiss">
          </mat-form-field>
        </div>
        <button
          mat-raised-button
          class="update-button"
          type="submit"
          color="primary"
          [disabled]="!settingsForm.valid || !settingsHasChanges()"
        >
          Update
        </button>
      </form>
    </div>`,
  styles:
   `.stream-area { font-family: "Red Hat Display"; font-weight: bold; width: 1600px; height: 900px; transition: opacity 1s; }
    .client-hits-overlay { position: absolute; }
    .ok { color: rgb(135, 178, 0); }
    .meh { color: rgb(254, 203, 34); }
    .miss { color: rgb(233, 20, 33); }
    .counter-count { font-size: 20px; }
    .counter-label { font-size: 14px; }
    .hit { display: flex; align-items: end; padding: 7px 5px; align-self: center; text-align: center; min-width: 45px; }
    .hits { display: flex; }
    .control-area { background-color: green; display: flex; flex-direction: column; gap: 10px; padding: 10px; }
    .settings-row { display: flex; flex-direction: row; gap: 10px; }
    .hide { opacity: 0; }
    .disable { display: none; }`,
})
export class HitCounters {
  webSocket?: WebSocket;
  tosuConnected = false;
  data?: any;
  clients: Client[] = [];
  transformX = 0;
  transformY = 0;
  hitFontSizeOverride = 0;
  labelFontSizeOverride = 0;
  fontName = "";
  fontColorOk = "#87B200";
  fontColorMeh = "#FECB22";
  fontColorMiss = "#E91421";
  loadedFonts: string[] = [];

  settingsForm: FormGroup;
  transformXFormControl: FormControl;
  transformYFormControl: FormControl;
  hitFontSizeFormControl: FormControl;
  labelFontSizeFormControl: FormControl;
  fontNameFormControl: FormControl;
  fontColorOkFormControl: FormControl;
  fontColorMehFormControl: FormControl;
  fontColorMissFormControl: FormControl;

  constructor() {
    this.transformXFormControl = new FormControl(0);
    this.transformYFormControl = new FormControl(0);
    this.hitFontSizeFormControl = new FormControl(0);
    this.labelFontSizeFormControl = new FormControl(0);
    this.fontNameFormControl = new FormControl("");
    this.fontColorOkFormControl = new FormControl("");
    this.fontColorMehFormControl = new FormControl("");
    this.fontColorMissFormControl = new FormControl("");
    this.settingsForm = new FormGroup({
      transformX: this.transformXFormControl,
      transformY: this.transformYFormControl,
      hitFontSize: this.hitFontSizeFormControl,
      labelFontSize: this.labelFontSizeFormControl,
      fontName: this.fontNameFormControl,
      fontColorOk: this.fontColorOkFormControl,
      fontColorMeh: this.fontColorMehFormControl,
      fontColorMiss: this.fontColorMissFormControl,
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

      const numClients = this.data.tourney.clients?.length ?? 0;
      while (this.clients.length < numClients) this.clients.push({ top: 0, left: 0, hitFontSize: 20, labelFontSize: 14, gameMode: 0, countOk: 0, countMeh: 0, countMiss: 0, visible: true });
      while (this.clients.length > numClients) this.clients.pop();
      const teamSize = numClients / 2; // let's assume this is going to be a whole number

      for (let i = 0; i < numClients; i++) {
        const theClient = this.clients[i];
        const clientData = this.data.tourney.clients[i];

        theClient.gameMode = clientData.play.mode.number;
        theClient.countOk = clientData.play.hits[100] > 0 ? clientData.play.hits[100] : clientData.play.hits[100];
        theClient.countMeh = clientData.play.hits[50] > 0 ? clientData.play.hits[50] : clientData.play.hits[50];
        theClient.countMiss = clientData.play.hits[0] > 0 ? clientData.play.hits[0] : clientData.play.hits[0];

        if (teamSize === 1 ) {
          theClient.top = 185 + this.transformY;
          theClient.left = i * 800 + 380 + this.transformX;
          theClient.hitFontSize = this.hitFontSizeOverride || 30;
          theClient.labelFontSize = this.labelFontSizeOverride || 24;
        }
        // assumes 16:9 res instead of 4:3 like the others
        else if (teamSize === 2) {
          const top_modifier = i % 2 >= 1 ? 300 : 0;
          const left_modifier = 520;
          theClient.top = top_modifier + 152 + this.transformY;
          theClient.left = Math.floor(i / 2) * 530 + left_modifier + this.transformX;
          theClient.hitFontSize = this.hitFontSizeOverride || 20;
          theClient.labelFontSize = this.labelFontSizeOverride || 14;
        }
        else if (teamSize === 3) {
          const top_modifier = i % 3 >= 1 ? 300 : 0;
          const left_modifier = [340, 140, 540][i % 3];
          theClient.top = top_modifier + 145 + this.transformY;
          theClient.left = Math.floor(i / 3) * 800 + left_modifier + this.transformX;
          theClient.hitFontSize = this.hitFontSizeOverride || 18;
          theClient.labelFontSize = this.labelFontSizeOverride || 12;
        }
        else if (teamSize === 4) {
          const top_modifier = i % 4 >= 2 ? 300 : 0;
          const left_modifier = i % 2 == 0 ? 140 : 540;
          theClient.top = top_modifier + 145 + this.transformY;
          theClient.left = Math.floor(i / 4) * 800 + left_modifier + this.transformX;
          theClient.hitFontSize = this.hitFontSizeOverride || 18;
          theClient.labelFontSize = this.labelFontSizeOverride || 12;
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

  refreshSettings() {
    this.transformXFormControl.setValue(parseInt(localStorage.getItem(HIT_COUNTERS_SETTINGS_TRANSFORM_X) || "0"));
    this.transformYFormControl.setValue(parseInt(localStorage.getItem(HIT_COUNTERS_SETTINGS_TRANSFORM_Y) || "0"));
    this.hitFontSizeFormControl.setValue(parseInt(localStorage.getItem(HIT_COUNTERS_SETTINGS_HIT_FONT_SIZE) || "0"));
    this.labelFontSizeFormControl.setValue(parseInt(localStorage.getItem(HIT_COUNTERS_SETTINGS_LABEL_FONT_SIZE) || "0"));
    this.fontNameFormControl.setValue(localStorage.getItem(HIT_COUNTERS_SETTINGS_FONT_NAME) || "Red Hat Display");
    this.fontColorOkFormControl.setValue(localStorage.getItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_OK) || "#87B200");
    this.fontColorMehFormControl.setValue(localStorage.getItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_MEH) || "#FECB22");
    this.fontColorMissFormControl.setValue(localStorage.getItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_MISS) || "#E91421");

    this.transformX = this.transformXFormControl.value;
    this.transformY = this.transformYFormControl.value;
    this.hitFontSizeOverride = this.hitFontSizeFormControl.value;
    this.labelFontSizeOverride = this.labelFontSizeFormControl.value;
    this.fontName = this.fontNameFormControl.value;
    this.fontColorOk = this.fontColorOkFormControl.value;
    this.fontColorMeh = this.fontColorMehFormControl.value;
    this.fontColorMiss = this.fontColorMissFormControl.value;

    if (this.fontName && !this.loadedFonts.includes(this.fontName)) {
      const fontName2 = this.fontName.replace(" ", "+");
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontName2}&display=swap`;
      document.head.appendChild(link);
      this.loadedFonts.push(this.fontName);
    }
  }

  settingsHasChanges() {
    return this.transformX !== this.transformXFormControl.value ||
      this.transformY !== this.transformYFormControl.value ||
      this.hitFontSizeOverride !== this.hitFontSizeFormControl.value ||
      this.labelFontSizeOverride !== this.labelFontSizeFormControl.value ||
      this.fontName !== this.fontNameFormControl.value ||
      this.fontColorOk !== this.fontColorOkFormControl.value ||
      this.fontColorMeh !== this.fontColorMehFormControl.value ||
      this.fontColorMiss !== this.fontColorMissFormControl.value;
  }

  updateSettings() {
    localStorage.setItem(HIT_COUNTERS_SETTINGS_TRANSFORM_X, this.transformXFormControl.value.toString());
    localStorage.setItem(HIT_COUNTERS_SETTINGS_TRANSFORM_Y, this.transformYFormControl.value.toString());
    localStorage.setItem(HIT_COUNTERS_SETTINGS_HIT_FONT_SIZE, this.hitFontSizeFormControl.value.toString());
    localStorage.setItem(HIT_COUNTERS_SETTINGS_LABEL_FONT_SIZE, this.labelFontSizeFormControl.value.toString());
    localStorage.setItem(HIT_COUNTERS_SETTINGS_FONT_NAME, this.fontNameFormControl.value);
    localStorage.setItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_OK, this.fontColorOkFormControl.value);
    localStorage.setItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_MEH, this.fontColorMehFormControl.value);
    localStorage.setItem(HIT_COUNTERS_SETTINGS_FONT_COLOR_MISS, this.fontColorMissFormControl.value);
    this.refreshSettings();
  }

  toggleClientVisibility(index: number) {
    this.clients[index].visible = !this.clients[index].visible;
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  declarations: [ HitCounters ],
  exports:      [ HitCounters ],
  bootstrap:    [ HitCounters ]
})
export class HitCountersModule {}