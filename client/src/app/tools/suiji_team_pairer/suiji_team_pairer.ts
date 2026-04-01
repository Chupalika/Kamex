import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgModule, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, Subscription, interval, filter, timer, take, finalize } from 'rxjs';

interface Slot {
  slotRows: SlotRow[];
  players: string[];
  currentPlayerIndex: number;
  spinSpeed: number;
  spinEvents: Subject<number>;
  stopOnPlayer: boolean;
  playerToStopOn: number;
  flagUrls: string[];
}

interface SlotRow {
  offset: number;
  playerIndex: number;
  visible: boolean;
}

//const test = [["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"], ["T9", "T10", "T11", "T12", "T13", "T14", "T15", "T16"]];

@Component({
  selector: 'suiji-team-pairer',
  templateUrl: './suiji_team_pairer.html',
  styleUrls: ['./suiji_team_pairer.scss']
})
export class SuijiTeamPairer {
  numSlots: number = 2;
  slots: Slot[] = [];
  numSlotPadRows: number = 5;
  slotRowWidth: number = 160;
  initialSpinSpeed: number = 100;
  slowDownSpeed: number = 1.2;
  stopThreshold: number = 1000;
  slotSpinners: Array<Subscription|undefined> = [];
  teams: string[][] = [];
  @ViewChildren("playersInput") playersInputs!: QueryList<ElementRef>;
  spinning = false;

  constructor(private changeDetectorRef: ChangeDetectorRef) {
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
        flagUrls: [],
      };
      this.slots.push(slot);
      const offsets = Array.from({ length: 2 * this.numSlotPadRows + 1 }, (_, i) => i - this.numSlotPadRows);
      for (let offset of offsets) {
        slot.slotRows.push({offset, playerIndex: this.getPlayerIndex(slotIndex, offset), visible: offset >= -4 && offset <= 4});
      }
      this.slotSpinners.push(undefined);
    }
    console.log(this.slots);
  }

  getBackgroundImage(): string {
    return `url("./assets/tsc/bg.png")`;
  }

  getMargin(offset: number): string {
    return String(offset * this.slotRowWidth) + "px";
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

  toggleSpin(slotIndex: number) {
    if (this.slotSpinners[slotIndex]) {
      this.slotSpinners[slotIndex]!.unsubscribe();
      this.slotSpinners[slotIndex] = undefined;
    }
    else {
      this.slots[slotIndex].spinSpeed = this.initialSpinSpeed;
      this.slotSpinners[slotIndex] = interval(this.slots[slotIndex].spinSpeed).subscribe(x => this.spinSlot(slotIndex));
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
      }
    };

    slot.spinEvents.pipe(take(1)).subscribe(() => {
      this.slotSpinners[slotIndex]!.unsubscribe();
      const targetOffset = ((targetPlayerIndex ?? 0) + Math.floor(Math.log(this.stopThreshold / slot.spinSpeed) / Math.log(this.slowDownSpeed))) % slot.players.length;
      this.slotSpinners[slotIndex] = interval(this.slots[slotIndex].spinSpeed)
        .subscribe(() => {
          if (targetPlayerIndex === undefined || slot.currentPlayerIndex === targetOffset) {
            console.log("slowing down");
            this.slotSpinners[slotIndex]!.unsubscribe();
            this.slotSpinners[slotIndex] = undefined;
            slowDown();
          } else this.spinSlot(slotIndex);
      });
    });
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
    console.log(slot);
  }

  saveTeam() {
    const team = [];
    for (let slotIndex = 0; slotIndex < this.numSlots; slotIndex++) {
      const playerIndex = this.slots[slotIndex].currentPlayerIndex;
      const playerName = this.slots[slotIndex].players[playerIndex];
      if (!playerName) return;
      this.slots[slotIndex].players.splice(playerIndex, 1);
      const playersInput = this.playersInputs.get(slotIndex)!.nativeElement;
      playersInput.value = this.slots[slotIndex].players.join("\n");
      team.push(playerName);
      this.onPlayersChange(slotIndex, playersInput.value);
    }
    this.teams.push(team);
  }

  getCurrentPlayer(slotIndex: number) {
    const playerIndex = this.slots[slotIndex].currentPlayerIndex;
    const playerName = this.slots[slotIndex].players[playerIndex];
    return playerName;
  }

  onPlayersChange(slotIndex: number, inputText: string) {
    const playerNames = inputText.split("\n");
    const slot = this.slots[slotIndex];
    slot.players = playerNames;
    slot.flagUrls = playerNames.map((playerName) => `./assets/tsc/flags/${playerName}.png`);
    for (let slotRow of slot.slotRows) {
      slotRow.playerIndex = this.getPlayerIndex(slotIndex, slotRow.offset);
    }
    console.log(this.slots);
  }
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [ SuijiTeamPairer ],
  exports: [ SuijiTeamPairer ],
  bootstrap: [ SuijiTeamPairer ]
})
export class SuijiTeamPairerModule {}