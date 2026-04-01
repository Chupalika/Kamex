import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OsuUserDto, OsuBeatmapDto, OsuBeatmapDifficultyAttributesDto, OsuMatchDto } from '../models/dtos';
import { OsuApiError } from '../models/errors';
import { GameMode } from '../models/enums';

@Injectable()
export class OsuApiService {
  oauthToken: string = "";
  expireTime?: Date;

  constructor(private configService: ConfigService) {}

  async oauthRefresh() {
    if (this.expireTime === undefined || this.expireTime < new Date()) {
      const headers = {"Content-Type": "application/json"};
      const body = {
        grant_type: "client_credentials",
        client_id: this.configService.get("OSU_API_V2_CLIENT_ID"),
        client_secret: this.configService.get("OSU_API_V2_CLIENT_SECRET"),
        scope: "public",
      };
      const request = new Request(this.configService.get("OSU_API_V2_TOKEN_URL"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const response = await fetch(request);
      const responseJson = await response.json();
      // TODO: make real errors (and also fix message not showing)
      if (responseJson["error"] !== undefined) {
        console.error(responseJson);
        throw new OsuApiError(responseJson["error"]);
      }
      this.oauthToken = responseJson["access_token"];
      this.expireTime = new Date((new Date()).getTime() + (responseJson["expires_in"] * 1000));
    }
  }

  async getUser(id: number, mode?: GameMode): Promise<OsuUserDto> {
    await this.oauthRefresh();
    const url = mode ? `users/${id}/${mode}` : `users/${id}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const request = new Request(this.configService.get("OSU_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.error(responseJson);
      throw new OsuApiError(responseJson["error"]);
    }
    return {
      id: responseJson["id"],
      username: responseJson["username"],
      country: responseJson["country_code"],
      statistics: {
        pp: responseJson["statistics"]["pp"],
        globalRank: responseJson["statistics"]["global_rank"],
      },
    };
  }

  async getUsers(ids: number[], mode: GameMode): Promise<OsuUserDto[]> {
    await this.oauthRefresh();
    let url = `users?`;
    for (let id of ids) url += `ids[]=${id}&`;
    url = url.slice(0, -1);
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const request = new Request(this.configService.get("OSU_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.error(responseJson);
      throw new OsuApiError(responseJson["error"]);
    }
    return responseJson["users"].map((user) => {
      return {
        id: user["id"],
        username: user["username"],
        country: user["country_code"],
        statistics: {
          pp: user["statistics_rulesets"][mode]["pp"],
          globalRank: user["statistics_rulesets"][mode]["global_rank"],
        },
      };
    });
  }

  async getBeatmap(id: number): Promise<OsuBeatmapDto> {
    await this.oauthRefresh();
    const url = `beatmaps/${id}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const request = new Request(this.configService.get("OSU_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.error(responseJson);
      throw new OsuApiError(responseJson["error"]);
    }
    return {
      accuracy: responseJson["accuracy"],
      ar: responseJson["ar"],
      beatmapset: {
        artist: responseJson["beatmapset"]["artist"],
        creator: responseJson["beatmapset"]["creator"],
        id: responseJson["beatmapset"]["id"],
        source: responseJson["beatmapset"]["source"],
        title: responseJson["beatmapset"]["title"],
        userId: responseJson["beatmapset"]["user_id"],
      },
      beatmapsetId: responseJson["beatmapset_id"],
      bpm: responseJson["bpm"],
      cs: responseJson["cs"],
      difficultyRating: responseJson["difficulty_rating"],
      drain: responseJson["drain"],
      hitLength: responseJson["hit_length"],
      id: responseJson["id"],
      lastUpdated: new Date(responseJson["last_updated"]),
      mode: responseJson["mode"],
      totalLength: responseJson["total_length"],
      userId: responseJson["user_id"],
      version: responseJson["version"],
      owners: responseJson["owners"],
    };
  }

  async getBeatmapDifficultyAttributes(id: number, mods: string[], gameMode: string): Promise<OsuBeatmapDifficultyAttributesDto> {
    await this.oauthRefresh();
    const url = `beatmaps/${id}/attributes`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const body = { mods, ruleset: gameMode };
    const request = new Request(this.configService.get("OSU_API_V2_URL") + url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.error(responseJson);
      throw new OsuApiError(responseJson["error"]);
    }
    return {
      maxCombo: responseJson["attributes"]["max_combo"],
      starRating: responseJson["attributes"]["star_rating"],
    };
  }

  async getMatch(id: number, beforeEvent?: number): Promise<OsuMatchDto> {
    await this.oauthRefresh();
    let url = `matches/${id}`;
    if (beforeEvent) url += `?before=${beforeEvent}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.oauthToken}`,
      "x-api-version": "20220705",
    }
    const request = new Request(this.configService.get("OSU_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.error(responseJson);
      throw new OsuApiError(responseJson["error"]);
    }
    /*
    // use this to look at what the response looks like
    for (let event of responseJson["events"]) {
      //if (event["game"]) console.log(event["game"]["scores"]);
      if (event["game"]) console.log(event["game"]);
    }
    throw new OsuApiError();
    */

    return {
      id: responseJson["match"]["id"],
      startTime: new Date(responseJson["match"]["start_time"]),
      endTime: new Date(responseJson["match"]["end_time"]),
      firstEventId: responseJson["first_event_id"],
      lastEventId: responseJson["last_event_id"],
      name: responseJson["match"]["name"],
      events: responseJson["events"].map((event) => ({
        id: event["id"],
        timestamp: new Date(event["timestamp"]),
        userId: event["user_id"],
        game: event["game"] ? {
          beatmapId: event["game"]["beatmap_id"],
          id: event["game"]["id"],
          startTime: new Date(event["game"]["start_time"]),
          endTime: new Date(event["game"]["end_time"]),
          mode: event["game"]["mode"],
          mods: event["game"]["mods"],
          scores: event["game"]["scores"].map((score) => ({
            accuracy: score["accuracy"],
            endedAt: new Date(score["ended_at"]),
            maxCombo: score["max_combo"],
            mods: score["mods"],
            rank: score["rank"],
            score: score["total_score"],
            statistics: {
              perfect: score["statistics"]["perfect"],
              great: score["statistics"]["great"],
              good: score["statistics"]["good"],
              ok: score["statistics"]["ok"],
              meh: score["statistics"]["meh"],
              miss: score["statistics"]["miss"],
              largeTickHit: score["statistics"]["large_tick_hit"],
              smallTickHit: score["statistics"]["small_tick_hit"],
            },
            userId: score["user_id"],
          })),
        } : undefined,
      })),
    };
  }
}