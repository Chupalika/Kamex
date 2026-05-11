import { HydratedDocument, Model } from "mongoose";
import { TournamentMatch } from "./schemas/tournament-match.schema";
import { TournamentTeam } from "./schemas/tournament-team.schema";
import { TournamentPlayer } from "./schemas/tournament-player.schema";

// manually populates match participants and conditionals with player/team info based on whether it's a team match or not
// (note, do NOT use this before saving the doc, or else it will save the whole object instead of an ObjectId under playerOrTeam!)
export async function populateMatch(match: HydratedDocument<TournamentMatch>, playerModel: Model<TournamentPlayer>, teamModel: Model<TournamentTeam>) {
  await match.populate([{ path: "referees", populate: "roles" }, { path: "streamers", populate: "roles" }, { path: "commentators", populate: "roles" }]);
  if (match.isTeamMatch) {
    await Promise.all([
      match.populate({ path: "participants", populate: { path: "playerOrTeam", model: teamModel, populate: { path: "players" } } }),
      match.populate({ path: "conditionals", populate: { path: "playerOrTeam", model: teamModel, populate: { path: "players" } } })
    ]);
  } else {
    return Promise.all([
      match.populate({ path: "participants", populate: { path: "playerOrTeam", model: playerModel } }),
      match.populate({ path: "conditionals", populate: { path: "playerOrTeam", model: playerModel } })
    ]);
  }
}

// function copied from client side -> mappool page
export function filterConditionalMatches(roundMatches: TournamentMatch[]) {
  const matchesById: Map<string, TournamentMatch> = new Map();
  for (let match of roundMatches) {
    matchesById.set(match.id, match);
  }
  // Set of match IDs that should be filtered out
  const filteredOut = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of roundMatches) {
      if (filteredOut.has(match.id)) continue;
      let shouldFilter = false;
      for (const conditional of match.conditionals) {
        const conditionalMatch = matchesById.get(conditional.matchId);
        // filter this match if the conditional match is already filtered out
        if (filteredOut.has(conditional.matchId)) {
          shouldFilter = true;
          break;
        }
        // ignore if the match is not found
        if (!conditionalMatch) continue;
        // ignore if not scored yet
        if (conditionalMatch.participants.map((p) => p.score).every((score) => score === 0)) continue;
        const highestScore = Math.max(...conditionalMatch.participants.map((p) => p.score));
        const conditionalParticipant = conditionalMatch.participants.find((p) => {
          if ("username" in conditional.playerOrTeam) {
            return "username" in p.playerOrTeam && p.playerOrTeam.playerId === conditional.playerOrTeam.playerId;
          } else {
            return !("username" in p.playerOrTeam) && `${(p.playerOrTeam as HydratedDocument<TournamentTeam>)._id}` === `${(conditional.playerOrTeam as HydratedDocument<TournamentTeam>)._id}`;
          }
        });
        // ignore if participant not found
        if (!conditionalParticipant) continue;
        if (conditional.win && conditionalParticipant.score < highestScore) {
          shouldFilter = true;
          break;
        }
        if (!conditional.win && conditionalParticipant.score >= highestScore) {
          shouldFilter = true;
          break;
        }
      }
      if (shouldFilter) {
        filteredOut.add(match.id);
        changed = true;
      }
    }
  }
  return roundMatches.filter((match) => !filteredOut.has(match.id));
}