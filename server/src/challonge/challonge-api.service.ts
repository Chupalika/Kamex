import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChallongeApiError } from 'src/models/errors';
import { ChallongeTournamentDto } from 'src/models/dtos';

@Injectable()
export class ChallongeApiService {
  oauthToken: string = "";
  expireTime?: Date;

  constructor(private configService: ConfigService) {}

  async oauthRefresh() {
    if (this.expireTime === undefined || this.expireTime < new Date()) {
      const headers = {"Content-Type": "application/x-www-form-urlencoded"};
      const body = {
        grant_type: "client_credentials",
        client_id: this.configService.get("CHALLONGE_API_V2_CLIENT_ID"),
        client_secret: this.configService.get("CHALLONGE_API_V2_CLIENT_SECRET"),
        scope: "application:organizer tournaments:read",
      };
      const request = new Request(this.configService.get("CHALLONGE_API_V2_TOKEN_URL"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const response = await fetch(request);
      const responseJson = await response.json();
      if (responseJson["error"] !== undefined) {
        console.log(responseJson);
        throw new ChallongeApiError();
      }
      this.oauthToken = responseJson["access_token"];
      this.expireTime = new Date((new Date()).getTime() + (responseJson["expires_in"] * 1000));
    }
  }

  async getTournaments(): Promise<any> {
    await this.oauthRefresh();
    const url = `tournaments.json`;
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization-Type": "v2",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const request = new Request(this.configService.get("CHALLONGE_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.log(responseJson);
      throw new ChallongeApiError();
    }
    return;
  }

  async getTournament(id: string): Promise<ChallongeTournamentDto> {
    await this.oauthRefresh();
    const url = `tournaments/${id}.json`;
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization-Type": "v2",
      "Authorization": `Bearer ${this.oauthToken}`,
    }
    const request = new Request(this.configService.get("CHALLONGE_API_V2_URL") + url, {
      method: "GET",
      headers,
    });
    const response = await fetch(request);
    const responseJson = await response.json();
    if (responseJson["error"] !== undefined) {
      console.log(responseJson);
      throw new ChallongeApiError();
    }
    return {
      id: responseJson["id"],
      attributes: {
        tournamentType: responseJson["attributes"]["tournament_type"],
        url: responseJson["attributes"]["url"],
        name: responseJson["attributes"]["name"],
        description: responseJson["attributes"]["description"],
      },
    };
  }
}