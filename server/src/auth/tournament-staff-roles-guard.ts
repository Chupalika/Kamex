import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TournamentStaffPermission } from 'src/models/enums';
import { TournamentService } from 'src/tournament/tournament.service';

export const permissionsKey = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(permissionsKey, permissions);

@Injectable()
export class TournamentStaffRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly tournamentService: TournamentService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.user === undefined) return false;
    //console.log(`checking ${request.user.osuId} access to ${request.method}:${request.route.path}`);

    const tournament = await this.tournamentService.getTournament(request.params.acronym);
    if (tournament.ownerId === request.user.osuId) return true;

    //const additionalPerms = this.reflector.get<string[]>(permissionsKey, context.getHandler()) ?? [];
    const permissions = this.reflector.get<string[]>(permissionsKey, context.getHandler()) ?? [];

    const staffMember = tournament.staffMembers.find((staffMember) => staffMember.playerId === request.user.osuId);
    //let ans = staffMember?.roles.some(role => role.permissions.includes(`${request.method}:${request.route.path}`));
    let ans = false;
    for (let permission of permissions) {
      ans = ans || staffMember?.roles.some(role => role.permissions.includes(permission));
    }
    return ans;
  }
}

// Special guard intended solely to check for permission to register for a tournament
@Injectable()
export class TournamentStaffRolesRegisterGuard implements CanActivate {
  constructor(private readonly tournamentService: TournamentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.user === undefined) return false;
    //console.log(`checking ${request.user.osuId} access to ${request.method}:${request.route.path}`);

    const tournament = await this.tournamentService.getTournament(request.params.acronym);

    const staffMember = tournament.staffMembers.find((staffMember) => staffMember.playerId === request.user.osuId);
    if (staffMember === undefined) return true;
    //return staffMember.roles.every(role => role.permissions.includes(`${request.method}:${request.route.path}`));
    return staffMember.roles.every(role => role.permissions.includes(TournamentStaffPermission.REGISTER));
  }
}