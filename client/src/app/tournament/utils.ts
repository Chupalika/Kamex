import { Mappool, MappoolSlot, Scoresheet, TournamentPlayer, TournamentTeam, Score, TournamentScoreWithRank, TournamentTeamScoreWithRank, MappoolSlotWithRanking, TournamentStatsPlayers, TournamentStatsTeams, TournamentRoundPlayerOverallStats, TournamentRoundTeamOverallStats, Tournament, TournamentStaffPermission, TournamentRound, ScoreMod } from '../models/models';

//const MAP_FIELDS: string[] = [];
//const NESTED_MAP_FIELDS: string[] = ["playerScores", "teamScores"];

export function processApiResponse(theObject: any) {
  for (const key in theObject) {
    const theValue = theObject[key];
    // converts maps
    //if (MAP_FIELDS.includes(key)) {
    //  theObject[key] = new Map(Object.entries(theObject[key]));
    //}
    // converts nested maps
    //else if (NESTED_MAP_FIELDS.includes(key)) {
    //  theObject[key] = new Map(Object.entries(theObject[key]).map(([key, value]) => [key, new Map(Object.entries(value as any))]));
    //}
    if (typeof theValue === "object" && theValue !== null) {
      processApiResponse(theValue);
    }
    // converts Dates
    else if (typeof theValue === "string" && isISOFormat(theValue)) {
      const parsedDate = new Date(theValue);
      if (!isNaN(parsedDate.getTime())) {
        theObject[key] = parsedDate;
      }
    }
  }
  return theObject;
}

function isISOFormat(theString: string) {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(theString)) return false;
  const date = new Date(theString);
  return date.toISOString() === theString;
}

export function hasPermission(tournament: Tournament, osuId: number|undefined, permission: TournamentStaffPermission): boolean {
  if (!osuId) return false;
  if (tournament.ownerId === osuId) return true;
  const staffMember = tournament.staffMembers.find((staffMember) => staffMember.playerId === osuId);
  return staffMember?.roles.some(role => role.permissions.includes(permission)) || false;
}

export function calculateStats(mappool: Mappool, scoresheet: Scoresheet, players: TournamentPlayer[], sortMethod: "ranksum"|"totalscore"|"zscore" = "ranksum", ignoreZero: boolean = false): TournamentStatsPlayers {
  const slotRanking: Map<string, MappoolSlotWithRanking> = new Map();
  const scoresByPlayer: Map<number, Map<string, TournamentScoreWithRank>> = new Map();
  const overallRankingMap: Map<number, TournamentRoundPlayerOverallStats> = new Map();
  for (let player of players) {
    scoresByPlayer.set(player.playerId, new Map());
    overallRankingMap.set(player.playerId, {
      playerId: player.playerId,
      rank: 0,
      rankSum: 0,
      scoreSum: 0,
      numMaps: 0,
      zscoreSum: 0,
    });
  }

  for (let slot of mappool.slots) {
    const slotScores: TournamentScoreWithRank[] = [];
    const slotScoresheet = scoresheet.slotScoresheets.find((slotScoresheet2) => slotScoresheet2.slot.label === slot.label);
    const playerScoreEntries = slotScoresheet?.playerScores || [];

    for (let playerScoreEntry of playerScoreEntries) {
      // Filter out non-tournament players
      const playerId = playerScoreEntry.player!.playerId;
      if (!scoresByPlayer.has(playerId)) continue;

      // Get the best score from this player
      const playerScores: Score[] = playerScoreEntry.scores;
      if (playerScores.length === 0) continue;
      let bestPlayerScore: Score = playerScores[0];
      playerScores.forEach((score) => {
        if (score.score > bestPlayerScore.score) bestPlayerScore = score;
      });
      const scoreWithRank = {
        ...bestPlayerScore,
        rank: 0,
        zscore: 0,
      };
      slotScores.push(scoreWithRank);
      scoresByPlayer.get(playerId)!.set(slot.label, scoreWithRank);
    }

    // Fill missing scores in scoresByPlayer with zeroes
    if (!ignoreZero) {
      for (let player of players) {
        const playerScores = scoresByPlayer.get(player.playerId);
        const fillerScore: TournamentScoreWithRank = {
          _id: "",
          playerId: player.playerId,
          beatmapId: slot.beatmap.beatmapId,
          timestamp: new Date(),
          score: 0,
          mods: [],
          accuracy: 0,
          countGreat: 0,
          countOk: 0,
          countMeh: 0,
          countMiss: 0,
          maxCombo: 0,
          matchId: 0,
          rank: 0,
          zscore: 0,
          isImported: true,
        };
        if (!playerScores?.has(slot.label)) {
          playerScores?.set(slot.label, fillerScore);
          slotScores.push(fillerScore);
        }
      }
    }

    // Sort pick scores and assign ranks (same scores get same ranks)
    slotScores.sort((a, b) => b.score - a.score);
    const mean = slotScores.reduce((sum, score) => sum + score.score, 0) / slotScores.length;
    const stdDev = Math.sqrt(slotScores.reduce((sum, score) => sum + Math.pow(score.score - mean, 2), 0) / slotScores.length);
    let currentRank = 1;
    let currentScore;
    for (let i = 0; i < slotScores.length; i++) {
      const slotScore = slotScores[i];
      if (currentScore === undefined || slotScore.score < currentScore) currentRank = i + 1;
      slotScore.rank = currentRank;
      slotScore.zscore = stdDev === 0 ? 0 : (slotScore.score - mean) / stdDev;
      currentScore = slotScore.score;
      overallRankingMap.get(slotScore.playerId)!.rankSum += currentRank;
      overallRankingMap.get(slotScore.playerId)!.scoreSum += slotScore.score;
      overallRankingMap.get(slotScore.playerId)!.numMaps += 1;
      overallRankingMap.get(slotScore.playerId)!.zscoreSum += slotScore.zscore;
    }
    slotRanking.set(slot.label, {
      ...slot,
      playerRanking: slotScores,
      teamRanking: [],
    });
  }

  let overallRanking: TournamentRoundPlayerOverallStats[] = Array.from(overallRankingMap.entries()).map(([_, stats]) => stats);
  if (ignoreZero) overallRanking = overallRanking.filter(x => x.rankSum !== 0);
  switch (sortMethod) {
    case "ranksum":
      if (ignoreZero) {
        overallRanking.sort((a, b) => {
          const aRankAvg = a.rankSum / a.numMaps;
          const bRankAvg = b.rankSum / b.numMaps;
          if (aRankAvg !== bRankAvg) return aRankAvg - bRankAvg;
          else return b.scoreSum - a.scoreSum;
        });
      } else {
        overallRanking.sort((a, b) => a.rankSum == b.rankSum ? b.scoreSum - a.scoreSum : a.rankSum - b.rankSum);
      }
      break;
    case "totalscore":
      overallRanking.sort((a, b) => b.scoreSum == a.scoreSum ? a.rankSum - b.rankSum : b.scoreSum - a.scoreSum);
      break;
    case "zscore":
      overallRanking.sort((a, b) => b.zscoreSum == a.zscoreSum ? a.rankSum - b.rankSum : b.zscoreSum - a.zscoreSum);
      break;
  }
  for (let i = 1; i <= overallRanking.length; i++) {
    overallRanking[i-1].rank = i;
  }

  return {
    slotRanking,
    scoresByPlayer,
    overallRanking,
  };
}

export function calculateTeamStats(mappool: Mappool, scoresheet: Scoresheet, teams: TournamentTeam[], sortMethod: "ranksum"|"totalscore"|"zscore" = "ranksum", ignoreZero: boolean = false): TournamentStatsTeams {
  const slotRanking: Map<string, MappoolSlotWithRanking> = new Map();
  const scoresByTeam: Map<string, Map<string, TournamentTeamScoreWithRank>> = new Map();
  const overallRankingMap: Map<string, TournamentRoundTeamOverallStats> = new Map();
  for (let team of teams) {
    scoresByTeam.set(team._id, new Map());
    overallRankingMap.set(team._id, {
      teamId: team._id,
      rank: 0,
      rankSum: 0,
      scoreSum: 0,
      numMaps: 0,
      zscoreSum: 0,
    });
  }

  for (let slot of mappool.slots) {
    const slotScores: TournamentTeamScoreWithRank[] = [];
    const slotScoresheet = scoresheet.slotScoresheets.find((slotScoresheet2) => slotScoresheet2.slot.label === slot.label);
    const teamScoreEntries = slotScoresheet?.teamScores || [];

    for (let teamScoreEntry of teamScoreEntries) {
      const teamId = teamScoreEntry.team!._id;
      // Get the best score from this team
      const teamScores: Score[] = teamScoreEntry.scores;
      if (teamScores.length === 0) continue;
      let bestTeamScore: Score = teamScores[0];
      teamScores.forEach((score) => {
        if (score.score > bestTeamScore.score) bestTeamScore = score;
      });
      const scoreWithRank = {
        ...bestTeamScore,
        teamId,
        rank: 0,
        zscore: 0,
      };
      slotScores.push(scoreWithRank);
      scoresByTeam.get(teamId)!.set(slot.label, scoreWithRank);
    }

    // Fill missing scores in scoresByTeam with zeroes
    if (!ignoreZero) {
      for (let team of teams) {
        const teamScores = scoresByTeam.get(team._id);
        const fillerScore: TournamentTeamScoreWithRank = {
          _id: "",
          playerId: 0,
          beatmapId: slot.beatmap.beatmapId,
          timestamp: new Date(),
          score: 0,
          mods: [],
          accuracy: 0,
          countGreat: 0,
          countOk: 0,
          countMeh: 0,
          countMiss: 0,
          maxCombo: 0,
          matchId: 0,
          teamId: team._id,
          rank: 0,
          zscore: 0,
          isImported: true,
        };
        if (!teamScores?.has(slot.label)) {
          teamScores?.set(slot.label, fillerScore);
          slotScores.push(fillerScore);
        }
      }
    }

    // Sort pick scores and assign ranks (same scores get same ranks)
    slotScores.sort((a, b) => b.score - a.score);
    const mean = slotScores.reduce((sum, score) => sum + score.score, 0) / slotScores.length;
    const stdDev = Math.sqrt(slotScores.reduce((sum, score) => sum + Math.pow(score.score - mean, 2), 0) / slotScores.length);
    let currentRank = 1;
    let currentScore;
    for (let i = 0; i < slotScores.length; i++) {
      const slotScore = slotScores[i];
      if (currentScore === undefined || slotScore.score < currentScore) currentRank = i + 1;
      slotScore.rank = currentRank;
      slotScore.zscore = stdDev === 0 ? 0 : (slotScore.score - mean) / stdDev;
      currentScore = slotScore.score;
      overallRankingMap.get(slotScore.teamId)!.rankSum += currentRank;
      overallRankingMap.get(slotScore.teamId)!.scoreSum += slotScore.score;
      overallRankingMap.get(slotScore.teamId)!.numMaps += 1;
      overallRankingMap.get(slotScore.teamId)!.zscoreSum += slotScore.zscore;
    }
    slotRanking.set(slot.label, {
      ...slot,
      playerRanking: [],
      teamRanking: slotScores,
    });
  }

  let overallRanking: TournamentRoundTeamOverallStats[] = Array.from(overallRankingMap.entries()).map(([_, stats]) => stats);
  if (ignoreZero) overallRanking = overallRanking.filter(x => x.rankSum !== 0);
  switch (sortMethod) {
    case "ranksum":
      if (ignoreZero) {
        overallRanking.sort((a, b) => {
          const aRankAvg = a.rankSum / a.numMaps;
          const bRankAvg = b.rankSum / b.numMaps;
          if (aRankAvg !== bRankAvg) return aRankAvg - bRankAvg;
          else return b.scoreSum - a.scoreSum;
        });
      } else {
        overallRanking.sort((a, b) => a.rankSum == b.rankSum ? b.scoreSum - a.scoreSum : a.rankSum - b.rankSum);
      }
      break;
    case "totalscore":
      overallRanking.sort((a, b) => b.scoreSum == a.scoreSum ? a.rankSum - b.rankSum : b.scoreSum - a.scoreSum);
      break;
    case "zscore":
      overallRanking.sort((a, b) => b.zscoreSum == a.zscoreSum ? a.rankSum - b.rankSum : b.zscoreSum - a.zscoreSum);
      break;
  }
  for (let i = 1; i <= overallRanking.length; i++) {
    overallRanking[i-1].rank = i;
  }

  return {
    slotRanking,
    scoresByTeam,
    overallRanking,
  };
}

export function convertDatetimeLocalToDate(date: string): Date {
  return new Date(date + "Z");
}

export function convertDateToDatetimeLocal(date: Date|string): string {
  let dup = date;
  if (typeof dup == "string") dup = new Date(dup);
  const month = String(dup.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dup.getUTCDate()).padStart(2, "0");
  const hour = String(dup.getUTCHours()).padStart(2, "0");
  const minute = String(dup.getUTCMinutes()).padStart(2, "0");
  return `${dup.getUTCFullYear()}-${month}-${day}T${hour}:${minute}`;
}

export function getLatestRoundIndex(tournamentRounds: TournamentRound[]): number {
  const currentTime = Date.now();
  let latestRoundIndex = 0;
  let latestRoundTime = 0;
  for (let i = 0; i < tournamentRounds.length; i++) {
    const round = tournamentRounds[i];
    if (round.startDate.getTime() <= currentTime && round.startDate.getTime() >= latestRoundTime) {
      latestRoundIndex = i;
      latestRoundTime = round.startDate.getTime();
    }
  }
  return latestRoundIndex;
}

export function getSortedMappool(tourney: Tournament, mappool: Mappool): MappoolSlot[] {
  const categoryMap = new Map<string, number>();
  for (let i = 0; i < tourney.slotCategories.length; i++) {
    const category = tourney.slotCategories[i];
    categoryMap.set(category.name, i);
  }
  const ans = [...mappool.slots];
  ans.sort((a, b) => {
    const categoryAIndex = categoryMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
    const categoryBIndex = categoryMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
    if (categoryAIndex !== categoryBIndex) return categoryAIndex - categoryBIndex;
    return a.label.localeCompare(b.label);
  });
  return ans;
}

// todo: figure out lazer mods
export function convertFromLazerMods(mods?: ScoreMod[]): string[] {
  return mods?.map(mod => mod.acronym) || [];
}

export function convertToLazerMods(mods: string[]): ScoreMod[] {
  return mods.map(acronym => ({ acronym, settings: [] }));
}

export function slotStarRating(slot: MappoolSlot) {
    return slot?.adjustedStarRating?.toPrecision(3) || slot?.beatmap.starRating.toPrecision(3);
  }

export function slotDisplayLength(slot: MappoolSlot) {
  const length = slot!.beatmap.length;
  if (convertFromLazerMods(slot?.requiredMods).includes("DT") || convertFromLazerMods(slot?.requiredMods).includes("NC")) {
    const adjustedLength = Math.floor(length / 1.5);
    return `${Math.floor(adjustedLength / 60)}:${(adjustedLength % 60).toString().padStart(2, "0")}`;
  }
  return `${Math.floor(length / 60)}:${(length % 60).toString().padStart(2, "0")}`;
}

export function slotBpm(slot: MappoolSlot) {
  if (convertFromLazerMods(slot?.requiredMods).includes("DT") || convertFromLazerMods(slot?.requiredMods).includes("NC")) return slot!.beatmap.bpm * 1.5;
  else return slot!.beatmap.bpm;
}

export function slotCs(slot: MappoolSlot) {
  if (convertFromLazerMods(slot?.requiredMods).includes("HR")) return getHrAdjustedStat(slot!.beatmap.cs);
  if (convertFromLazerMods(slot?.requiredMods).includes("EZ")) return getEzAdjustedStat(slot!.beatmap.cs);
  return slot!.beatmap.cs;
}

export function slotHp(slot: MappoolSlot) {
  if (convertFromLazerMods(slot?.requiredMods).includes("HR")) return getHrAdjustedStat(slot!.beatmap.hp);
  if (convertFromLazerMods(slot?.requiredMods).includes("EZ")) return getEzAdjustedStat(slot!.beatmap.hp);
  return slot!.beatmap.hp;
}

export function slotOd(slot: MappoolSlot) {
  if (convertFromLazerMods(slot?.requiredMods).includes("HR")) return getHrAdjustedStat(slot!.beatmap.od);
  if (convertFromLazerMods(slot?.requiredMods).includes("EZ")) return getEzAdjustedStat(slot!.beatmap.od);
  return slot!.beatmap.od;
}

export function slotAr(slot: MappoolSlot) {
  if (convertFromLazerMods(slot?.requiredMods).includes("HR")) return getHrAdjustedStat(slot!.beatmap.ar);
  if (convertFromLazerMods(slot?.requiredMods).includes("EZ")) return getEzAdjustedStat(slot!.beatmap.ar);
  return slot!.beatmap.ar;
}

export function getHrAdjustedStat(stat: number) {
  return Math.min(stat * 1.4, 10).toPrecision(2);
}

export function getEzAdjustedStat(stat: number) {
  return (stat / 2).toPrecision(2);
}