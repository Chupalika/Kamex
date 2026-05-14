import { Controller, Get, UseGuards, Request, HttpException, Patch, Body } from '@nestjs/common';
import { OsuOAuthGuard, OsuAuthenticatedGuard } from './osu-oauth.guard';
import { DiscordOAuthGuard } from './discord-oauth.guard';
import { AuthService } from './auth.service';
import { AppUserDto } from 'src/models/dtos';
import { AppUser } from 'src/schemas/app-user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('whoami')
  async whoami(@Request() req) {
    return req.user;
  }

  @Get('login-osu')
  @UseGuards(OsuOAuthGuard)
  async loginOsu(@Request() req) {
    return req.user;
  }

  @Get('login-osu-callback')
  @UseGuards(OsuOAuthGuard)
  osuAuthCallback(@Request() req) {
    // janky thing to close the login popup window
    return "<script>setInterval(window.close)</script>";
  }

  @Get('logout-osu')
  async logoutOsu(@Request() req) {
    await req.logout((error) => {
      if (error) throw HttpException;
    });
    return req.user;
  }

  @Get('login-discord')
  @UseGuards(OsuAuthenticatedGuard)
  @UseGuards(DiscordOAuthGuard)
  async loginDiscord(@Request() req) {
    return req.user;
  }

  @Get('login-discord-callback')
  @UseGuards(DiscordOAuthGuard)
  discordAuthCallback(@Request() req) {
    // janky thing to close the login popup window
    return "<script>setInterval(window.close)</script>";
  }

  @Get('logout-discord')
  @UseGuards(OsuAuthenticatedGuard)
  async logoutDiscord(@Request() req) {
    const appUser = await this.authService.unlinkDiscord(req.user.osuId);
    return appUser;
  }

  @Patch('update-user-settings')
  @UseGuards(OsuAuthenticatedGuard)
  async updateUserSettings(
      @Request() req,
      @Body() appUserDto: AppUserDto): Promise<AppUser> {
    const appUser = await this.authService.updateUserSettings(req.user.osuId, appUserDto);
    return appUser;
  }
}