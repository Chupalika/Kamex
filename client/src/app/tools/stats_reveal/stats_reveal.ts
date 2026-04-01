import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { finalize, switchMap, take } from 'rxjs/operators';
import { zip } from 'rxjs';

import { Tournament, TournamentRound, TournamentStatsPlayers, TournamentScoreWithRank, TournamentRoundPlayerOverallStats, MappoolSlot } from 'src/app/models/models';
import { calculateStats } from 'src/app/tournament/utils';
import { TournamentsService } from 'src/app/services/tournaments.service';

const STATS_REVEAL_SETTINGS_BACKGROUND = "stats_reveal_settings_background";

interface OverallStats extends TournamentRoundPlayerOverallStats {
  playerName: string;
}

@Component({
  selector: 'stats-reveal',
  templateUrl: './stats_reveal.html',
  styleUrls: ['./stats_reveal.scss']
})
export class StatsReveal {
  acronym = "";
  roundId = "";
  background = "";
  tournament?: Tournament;
  tournamentRound?: TournamentRound;
  loading = true;
  requestInProgress = false;
  stats?: TournamentStatsPlayers;
  highScorePerMap: Map<string, number> = new Map();
  lowScorePerMap: Map<string, number> = new Map();
  currentPage = 1;
  rowsPerPage = 16;

  overallColumnNames = ["rank", "playerName", "rankSum"];
  slotColumnNames = ["score"];

  settingsForm: FormGroup;
  backgroundFormControl: FormControl;
  
  constructor(private tournamentsService: TournamentsService, private route: ActivatedRoute) {
    this.backgroundFormControl =  new FormControl("");
    this.settingsForm = new FormGroup({
      background: this.backgroundFormControl,
    });
  }
  
  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.acronym = params.get("acronym") || "";
        this.roundId = params.get("roundId") || "";
        return zip([
          this.tournamentsService.getTournament(this.acronym),
          this.tournamentsService.getTournamentRound(this.acronym, this.roundId),
        ]);
      }),
      take(1),
      finalize(() => {this.loading = false;}),
    ).subscribe(([tournament, tournamentRound]) => {
      this.tournament = tournament;
      this.tournamentRound = tournamentRound;
      //console.log(tournamentRound);
      this.stats = calculateStats(tournamentRound.mappool, tournamentRound.scoresheet, tournament.players);
      //console.log(this.stats);

      for (let slot of tournamentRound.mappool.slots) {
        const scores = this.stats.slotRanking.get(slot.label)!.playerRanking;
        this.highScorePerMap.set(slot.label, scores[0].score);
        this.lowScorePerMap.set(slot.label, scores[scores.length-1].score);
      }
    });
    this.refreshSettings();
  }

  refreshSettings() {
    this.backgroundFormControl.setValue(localStorage.getItem(STATS_REVEAL_SETTINGS_BACKGROUND) ?? "");
    this.background = this.backgroundFormControl.value;
  }

  settingsHasChanges() {
    return this.background !== this.backgroundFormControl.value;
  }

  updateSettings() {
    localStorage.setItem(STATS_REVEAL_SETTINGS_BACKGROUND, this.backgroundFormControl.value);
    this.refreshSettings();
  }

  getOverallRanking(): OverallStats[] {
    const overallRanking = this.stats!.overallRanking.map((x) => {
      const player = this.tournament!.players.find((y) => y.playerId === x.playerId);
      return {
        ...x,
        playerName: player?.username ?? "",
      };
    });
    return overallRanking.slice((this.currentPage - 1) * this.rowsPerPage, (this.currentPage * this.rowsPerPage));
  }

  getSlotRankings(label: string): (TournamentScoreWithRank|undefined)[] {
    const slot = this.stats!.slotRanking.get(label)!;
    const overallStatsColumn = this.stats!.overallRanking.slice((this.currentPage - 1) * this.rowsPerPage, (this.currentPage * this.rowsPerPage));
    const ans = overallStatsColumn.map((overallStats) => slot.playerRanking.find((x) => x.playerId === overallStats.playerId));
    //console.log(ans);
    return ans;
  }

  pageUp() {
    this.currentPage = Math.max(this.currentPage - 1, 1);
  }

  pageDown() {
    this.currentPage = Math.min(this.currentPage + 1, Math.ceil(this.stats!.overallRanking.length / this.rowsPerPage) + 1);
  }

  getRankColor(rank: number) {
    if (rank >= 1 && rank <= 10) return "highlight-gold";
    if (rank >= 11 && rank <= 20) return "highlight-silver";
    if (rank >= 21 && rank <= 30) return "highlight-bronze";
    return "";
  }

  getScoreColor(label: string, score: number) {
    const highScore = this.highScorePerMap.get(label)!;
    const lowScore = this.lowScorePerMap.get(label)!;
    const interval = (highScore - lowScore) / 10;
    const percentile = (Math.floor((highScore - score) / interval) + 1) * 10;
    return `score-percentile-${percentile}`;
  }

  getCategoryIcon(slot: MappoolSlot) {
    return this.tournament?.slotCategories.find((x) => x.name === slot.category)?.iconLink ?? "";
  }
}

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    ReactiveFormsModule,
  ],
  declarations: [ StatsReveal ],
  exports: [ StatsReveal ],
  bootstrap: [ StatsReveal ]
})
export class StatsRevealModule {}