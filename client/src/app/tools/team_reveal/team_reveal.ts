import { CommonModule } from '@angular/common';
import { Component, NgModule, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, Subscription, interval, timer, take } from 'rxjs';
import tinycolor from 'tinycolor2';

const TEAM_REVEAL_SETTINGS_BACKGROUND = "team_reveal_settings_background";
const TEAM_REVEAL_SETTINGS_BACKGROUND_2 = "team_reveal_settings_background_2";
const TEAM_REVEAL_SETTINGS_MAIN_COLOR = "team_reveal_settings_main_color";

interface Slot {
  slotRows: SlotRow[];
  players: string[];
  currentPlayerIndex: number;
  spinSpeed: number;
  spinEvents: Subject<number>;
  stopOnPlayer: boolean;
  playerToStopOn: number;
  removeFromAllSlots: boolean;
}

interface SlotRow {
  offset: number;
  playerIndex: number;
  visible: boolean;
}

@Component({
  selector: 'team-reveal',
  templateUrl: './team_reveal.html',
  styleUrls: ['./team_reveal.scss']
})
export class TeamReveal {
  numSlots: number = 4;
  numTeams: number = 32;
  slots: Slot[] = [];
  numSlotPadRows: number = 2;
  //currentPlayerIndices: number[] = [];
  //players: string[][] = [];
  //slotRows: SlotRow[][] = [];
  slotRowHeight: number = 40;
  initialSpinSpeed: number = 100;
  slowDownSpeed: number = 1.2;
  stopThreshold: number = 1000;
  slotSpinners: Array<Subscription|undefined> = [];
  teams: string[][] = [];
  fillerArray: string[] = []; // Used for teams control for loop
  currentTeamIndex: number = 0;
  @ViewChildren("playersInput") playersInputs!: QueryList<ElementRef>;
  @ViewChildren("teamInput") teamInputs!: QueryList<ElementRef>;
  currentPage = 0;
  teamsPerPage = 16;
  slotsAudio = new Audio();
  slots2Audio = new Audio();
  spinning = false;
  teamView = false;
  background = "";
  background2 = "";
  mainColor = "";

  settingsForm: FormGroup;
  backgroundFormControl: FormControl;
  background2FormControl: FormControl;
  mainColorFormControl: FormControl;

  constructor() {
    //this.players = [teams.map(x => x[0]), teams.map(x => x[1]), teams.map(x => x[2]), teams.map(x => x[3])];
    //this.currentPlayerIndices = [];
    for (let slotIndex = 0; slotIndex < this.numSlots; slotIndex++) {
      //const players = teams.map(x => x[slotIndex]);
      const slot: Slot = {
        slotRows: [],
        players: [],
        //currentPlayerIndex: Math.floor(Math.random() * players[slotIndex].length),
        currentPlayerIndex: 0,
        spinSpeed: 100,
        spinEvents: new Subject<number>(),
        stopOnPlayer: false,
        playerToStopOn: 0,
        removeFromAllSlots: false,
      };
      this.slots.push(slot);
      const offsets = Array.from({ length: 2 * this.numSlotPadRows + 1 }, (_, i) => i - this.numSlotPadRows);
      for (let offset of offsets) {
        slot.slotRows.push({offset, playerIndex: this.getPlayerIndex(slotIndex, offset), visible: offset >= -1 && offset <= 1});
      }
      this.slotSpinners.push(undefined);
      //this.currentPlayerIndices.push(Math.floor(Math.random() * this.players[i].length));
    }
    for (let teamIndex = 0; teamIndex < this.numTeams; teamIndex++) {
      this.teams.push([]);
      this.fillerArray.push("");
    }
    /*
    for (let slotIndex = 0; slotIndex < this.numSlots; slotIndex++) {
      const rows = [];
      for (let offset of [-2, -1, 0, 1, 2]) {
        rows.push({offset, playerIndex: this.getPlayerIndex(slotIndex, offset), visible: offset >= -1});
      }
      this.slotRows.push(rows);
      this.slotSpinners.push(undefined);
    }
    */
    //console.log(this.slots);
    this.slotsAudio.src = "./assets/default/slots.wav";
    this.slotsAudio.loop = true;
    this.slots2Audio.src = "./assets/default/slots2.wav";

    this.backgroundFormControl =  new FormControl("");
    this.background2FormControl = new FormControl("");
    this.mainColorFormControl = new FormControl("");
    this.settingsForm = new FormGroup({
      background: this.backgroundFormControl,
      background2: this.background2FormControl,
      mainColor: this.mainColorFormControl,
    });
  }

  ngOnInit() {
    this.refreshSettings();
  }

  refreshSettings() {
    this.backgroundFormControl.setValue(localStorage.getItem(TEAM_REVEAL_SETTINGS_BACKGROUND) ?? "");
    this.background = this.backgroundFormControl.value;
    this.background2FormControl.setValue(localStorage.getItem(TEAM_REVEAL_SETTINGS_BACKGROUND_2) ?? "");
    this.background2 = this.background2FormControl.value;
    this.mainColorFormControl.setValue(localStorage.getItem(TEAM_REVEAL_SETTINGS_MAIN_COLOR) ?? "");
    this.mainColor = this.mainColorFormControl.value;
  }

  settingsHasChanges() {
    return this.background !== this.backgroundFormControl.value || this.background2 !== this.background2FormControl.value || this.mainColor !== this.mainColorFormControl.value;
  }

  updateSettings() {
    localStorage.setItem(TEAM_REVEAL_SETTINGS_BACKGROUND, this.backgroundFormControl.value);
    localStorage.setItem(TEAM_REVEAL_SETTINGS_BACKGROUND_2, this.background2FormControl.value);
    localStorage.setItem(TEAM_REVEAL_SETTINGS_MAIN_COLOR, this.mainColorFormControl.value);
    this.refreshSettings();
  }

  getLighterColor(): string {
    return tinycolor(this.mainColor).lighten().toString();
  }

  getMargin(offset: number): string {
    return String(offset * this.slotRowHeight + this.slotRowHeight) + "px";
  }

  getPlayer(slotIndex: number, playerIndex: number): string {
    return this.slots[slotIndex].players[playerIndex];
  }

  getPlayerIndex(slotIndex: number, offset: number): number {
    const slot = this.slots[slotIndex];
    let playerIndex = slot.currentPlayerIndex + offset;
    if (playerIndex < 0) playerIndex = slot.players.length - (-playerIndex % slot.players.length);
    playerIndex %= slot.players.length;
    return playerIndex;
  }

  toggleSlotsAudio() {
    let spinning2 = false;
    for (let slotSpinner of this.slotSpinners) {
      if (slotSpinner !== undefined) {
        spinning2 = true;
      }
    }
    if (this.spinning && !spinning2) {
      this.slotsAudio.pause();
      this.slots2Audio.load();
      this.slots2Audio.play();
    }
    if (!this.spinning && spinning2) {
      this.slotsAudio.load();
      this.slotsAudio.play();
    }
    this.spinning = spinning2;
  }

  toggleSpin(slotIndex: number) {
    if (this.slotSpinners[slotIndex]) {
      this.slotSpinners[slotIndex]!.unsubscribe();
      this.slotSpinners[slotIndex] = undefined;
      this.toggleSlotsAudio();
    }
    else {
      this.slots[slotIndex].spinSpeed = this.initialSpinSpeed;
      this.slotSpinners[slotIndex] = interval(this.slots[slotIndex].spinSpeed).subscribe(x => this.spinSlot(slotIndex));
      this.toggleSlotsAudio();
    }
  }

  stopSpin(slotIndex: number) {
    if (!this.slotSpinners[slotIndex]) return;
    const slot = this.slots[slotIndex];
    const targetPlayerIndex = slot.stopOnPlayer ? slot.playerToStopOn : undefined;

    const slowDown = () => {
      slot.spinSpeed *= this.slowDownSpeed;
      if (slot.spinSpeed < this.stopThreshold) {
        this.spinSlot(slotIndex);
        this.slotSpinners[slotIndex] = timer(slot.spinSpeed).subscribe(slowDown);
      } else {
        this.slotSpinners[slotIndex] = undefined;
        slot.spinSpeed = this.initialSpinSpeed;
        this.toggleSlotsAudio();
      }
    };

    slot.spinEvents.pipe(take(1)).subscribe(() => {
      this.slotSpinners[slotIndex]!.unsubscribe();
      const targetOffset = ((targetPlayerIndex ?? 0) + Math.floor(Math.log(this.stopThreshold / slot.spinSpeed) / Math.log(this.slowDownSpeed))) % slot.players.length;
      this.slotSpinners[slotIndex] = interval(this.slots[slotIndex].spinSpeed)
        .subscribe(() => {
          if (targetPlayerIndex === undefined || slot.currentPlayerIndex === targetOffset) {
            // console.log("slowing down");
            this.slotSpinners[slotIndex]!.unsubscribe();
            this.slotSpinners[slotIndex] = undefined;
            slowDown();
          } else this.spinSlot(slotIndex);
      });
    });

    // wait for current spin to finish before starting to slow down
    /*
    slot.spinEvents.pipe(
      filter(x => x == targetOffset),
      take(1)
    ).subscribe((x) => {
      console.log("slowing down");
      this.slotSpinners[slotIndex]!.unsubscribe();
      slowDown();
    });
    */
  }

  spinSlot(slotIndex: number) {
    const slot = this.slots[slotIndex];
    slot.currentPlayerIndex -= 1;
    if (slot.currentPlayerIndex < 0) slot.currentPlayerIndex = Math.max(0, slot.players.length - 1);
    for (let slotRow of slot.slotRows) {
      slotRow.offset += 1;
      if (slotRow.offset > this.numSlotPadRows) {
        slotRow.offset = -this.numSlotPadRows;
        slotRow.playerIndex = this.getPlayerIndex(slotIndex, slotRow.offset);
      }
      slotRow.visible = slotRow.offset >= -this.numSlotPadRows + 1 && slotRow.offset <= this.numSlotPadRows - 1;
    }
    timer(slot.spinSpeed).subscribe(() => slot.spinEvents.next(slot.currentPlayerIndex));
    // console.log(slot);
  }

  moveToTeam(slotIndex: number, playerName?: string) {
    let playerIndex: number;
    if (playerName === undefined) {
      playerIndex = this.slots[slotIndex].currentPlayerIndex;
      playerName = this.slots[slotIndex].players[playerIndex];
    } else {
      playerIndex = this.slots[slotIndex].players.indexOf(playerName);
    }

    if (!playerName || playerIndex === -1) return;
    this.teams[this.currentTeamIndex].push(playerName);

    if (this.slots[slotIndex].removeFromAllSlots) {
      for (let i = 0; i < this.slots.length; i++) {
        this.slots[i].players = this.slots[i].players.filter(p => p !== playerName);
        const playersInput = this.playersInputs.get(i)?.nativeElement;
        playersInput.value = this.slots[i].players.join("\n");
      }
    } else {
      this.slots[slotIndex].players.splice(playerIndex, 1);
      const playersInput = this.playersInputs.get(slotIndex)!.nativeElement;
      playersInput.value = this.slots[slotIndex].players.join("\n");
    }

    const teamInput = this.teamInputs.get(this.currentTeamIndex)!.nativeElement;
    teamInput.value = this.teams[this.currentTeamIndex].join("/");
  }

  moveAllToTeam() {
    const playerNames: string[] = [];
    for (let i = 0; i < this.numSlots; i++) {
      const idx = this.slots[i].currentPlayerIndex;
      playerNames.push(this.slots[i].players[idx]);
    }

    for (let i = 0; i < this.numSlots; i++) {
      this.moveToTeam(i, playerNames[i]);
    }
  }

  onPlayersChange(slotIndex: number, inputText: string) {
    const playerNames = inputText.split("\n");
    this.slots[slotIndex].players = playerNames;
  }

  onTeamChange(teamNumber: number, inputText: string) {
    // console.log(teamNumber);
    // console.log(inputText);
    const teamPlayers = inputText.split("/");
    this.teams[teamNumber] = teamPlayers;
  }

  pageUp() {
    this.currentPage = Math.max(this.currentPage - 1, 0);
  }

  pageDown() {
    this.currentPage = Math.min(this.currentPage + 1, Math.ceil(this.teams!.length / this.teamsPerPage));
  }

  isOnCurrentPage(index: number) {
    return index >= this.currentPage * this.teamsPerPage && index < (this.currentPage + 1) * this.teamsPerPage;
  }

  toggleTeamView() {
    this.teamView = !this.teamView;
  }
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [ TeamReveal ],
  exports: [ TeamReveal ],
  bootstrap: [ TeamReveal ]
})
export class TeamRevealModule {}
