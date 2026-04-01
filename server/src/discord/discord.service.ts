import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client, GatewayIntentBits, Events, Role, EmbedBuilder, SlashCommandBuilder, REST, Routes, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { HydratedDocument, Model } from 'mongoose';
import { TournamentProgress } from 'src/models/enums';
import { DiscordChannelNotFoundError, DiscordMemberNotFoundError, DiscordRoleNotFoundError, DiscordServerNotFoundError } from 'src/models/errors';
import { AppUser } from 'src/schemas/app-user.schema';
import { TournamentMatch } from 'src/schemas/tournament-match.schema';
import { TournamentPlayer } from 'src/schemas/tournament-player.schema';
import { TournamentTeam } from 'src/schemas/tournament-team.schema';
import { Tournament } from 'src/schemas/tournament.schema';

interface DiscordCommand {
  data: SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  commands: Map<string, DiscordCommand> = new Map([
    [
      'assign_all_player_role',
      {
        data: new SlashCommandBuilder()
          .setName("assign_all_player_role")
          .setDescription("Attempts to assigns player role to all registered players in the specified tournament."),
        execute: this.assignAllPlayerRole,
      }
    ]
  ]);

  constructor(
    private configService: ConfigService,
    @InjectModel(AppUser.name) private appUserModel: Model<AppUser>,
    @InjectModel(Tournament.name) private tournamentModel: Model<Tournament>,
    @InjectModel(TournamentPlayer.name) private tournamentPlayerModel: Model<TournamentPlayer>,
    @InjectModel(TournamentTeam.name) private tournamentTeamModel: Model<TournamentTeam>,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async onModuleInit() {
    this.client.on(Events.ClientReady, () => {
      console.log(`Discord bot ${this.client.user.tag} started`);
    });

    await this.registerSlashCommands();

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({ content: "Unknown command.", ephemeral: true });
      }

      await command.execute(interaction);
    });

    await this.client.login(this.configService.get("DISCORD_BOT_TOKEN"));
  }

  async registerSlashCommands() {
    const token = this.configService.get("DISCORD_BOT_TOKEN");
    const clientId = this.configService.get("DISCORD_CLIENT_ID");
    const rest = new REST({ version: "10" }).setToken(token);
    try {
      await rest.put(Routes.applicationCommands(clientId), { body: Array.from(this.commands.values()).map(command => command.data.toJSON()) });
    } catch (err) {
      console.log(err);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkMatchReminders() {
    const tourneys = await this.tournamentModel.find({ progress: TournamentProgress.ONGOING })
        .populate({ path: "rounds", populate: { path: "matches", populate: [{ path: "referees" }, { path: "streamers" }, { path: "commentators" }] } });
    
    for (const tourney of tourneys) {
      if (!tourney.discordSettings.serverId || !tourney.discordSettings.matchReminderChannelId) continue;

      const theServer = this.client.guilds.cache.get(tourney.discordSettings.serverId);
      if (!theServer) continue;
      const reminderChannel = theServer.channels.cache.get(tourney.discordSettings.matchReminderChannelId);
      if (!reminderChannel || !reminderChannel.isTextBased()) continue;

      const reminderMinutes = tourney.discordSettings.matchReminderMinutes || 0;

      for (const round of tourney.rounds) {
        for (const match of round.matches) {
          const reminderTime = match.time.getTime() - (reminderMinutes * 60000);
          const nowTime = (new Date()).getTime();
          // trigger reminder only if current time is within 1 minute of the reminder time
          if (Math.abs(nowTime - reminderTime) < 30000) {
            // Conditional populate playerOrTeam based on isTeamMatch
            const hydratedMatch = match as HydratedDocument<TournamentMatch>;
            if (hydratedMatch.isTeamMatch) {
              await hydratedMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentTeamModel, populate: { path: "players" } } });
            } else {
              await hydratedMatch.populate({ path: "participants", populate: { path: "playerOrTeam", model: this.tournamentPlayerModel } });
            }

            // fetch appusers
            const appUserIdsToFetch = new Set<number>();
            for (const participant of hydratedMatch.participants) {
              if ("playerId" in participant.playerOrTeam) {
                appUserIdsToFetch.add(participant.playerOrTeam.playerId);
              } else if ("players" in participant.playerOrTeam) {
                for (const player of participant.playerOrTeam.players) {
                  appUserIdsToFetch.add(player.playerId);
                }
              }
            }
            for (const staffMember of [...match.referees, ...match.streamers, ...match.commentators]) {
              appUserIdsToFetch.add(staffMember.playerId);
            }
            const appUsers = await this.appUserModel.find({ osuId: { $in: Array.from(appUserIdsToFetch) } });
            const appUserToDiscordId = new Map<number, string>();
            for (const appUser of appUsers) {
              if (appUser.discordId) {
                appUserToDiscordId.set(appUser.osuId, appUser.discordId);
              }
            }

            // construct message
            let messageContent = `**Match Reminder: ${tourney.acronym.toUpperCase()} ${round.name} Match ${match.id} starts in ${reminderMinutes} minutes**\n`;
            if (match.participants.length > 0) {
              messageContent += "__Participants__";
              for (const participant of hydratedMatch.participants) {
                if ("playerId" in participant.playerOrTeam) {
                  messageContent += `\n\`${participant.playerOrTeam.username}\``;
                  const discordId = appUserToDiscordId.get(participant.playerOrTeam.playerId);
                  if (discordId) messageContent += ` (<@!${discordId}>)`;
                } else if ("players" in participant.playerOrTeam) {
                  messageContent += `\n\`${participant.playerOrTeam.name}\`:\n- `;
                  for (const player of participant.playerOrTeam.players) {
                    messageContent += `\`${player.username}\` `;
                    const discordId = appUserToDiscordId.get(player.playerId);
                    if (discordId) messageContent += `(<@!${discordId}>) `;
                  }
                }
              }
            }
            if (match.referees.length > 0) {
              messageContent += "\n\n__Referees__";
              for (const referee of match.referees) {
                messageContent += `\n\`${referee.username}\``;
                const discordId = appUserToDiscordId.get(referee.playerId);
                if (discordId) messageContent += ` (<@!${discordId}>)`;
              }
            }
            if (match.streamers.length > 0) {
              messageContent += "\n\n__Streamers__";
              for (const streamer of match.streamers) {
                messageContent += `\n\`${streamer.username}\``;
                const discordId = appUserToDiscordId.get(streamer.playerId);
                if (discordId) messageContent += ` (<@!${discordId}>)`;
              }
            }
            if (match.commentators.length > 0) {
              messageContent += "\n\n__Commentators__";
              for (const commentator of match.commentators) {
                messageContent += `\n\`${commentator.username}\``;
                const discordId = appUserToDiscordId.get(commentator.playerId);
                if (discordId) messageContent += ` (<@!${discordId}>)`;
              }
            }
            await reminderChannel.send({ content: messageContent });
          }
        }
      }
    }
  }

  async verifyUserIsInServer(serverId: string, userId: string) {
    const theServer = this.client.guilds.cache.get(serverId);
    if (!theServer) throw new DiscordServerNotFoundError(serverId);
    try {
      const theMember = await theServer.members.fetch(userId);
    } catch (e) {
      if (e.code === 10007 || e.code === 10013) {
        throw new DiscordMemberNotFoundError(userId);
      }
      else throw e;
    }
  }

  async assignRole(serverId: string, userId: string, roleId?: string, roleName?: string) {
    const theServer = this.client.guilds.cache.get(serverId);
    if (!theServer) throw new DiscordServerNotFoundError(serverId);

    let theMember: GuildMember;
    try {
      theMember = await theServer.members.fetch(userId);
    } catch (e) {
      if (e.code === 10007 || e.code === 10013) {
        throw new DiscordMemberNotFoundError(userId);
      }
      else throw e;
    }

    let theRole: Role;
    if (roleId) theRole = theServer.roles.cache.get(roleId);
    else if (roleName) theRole = theServer.roles.cache.find((role) => role.name.toLowerCase() === roleName.toLowerCase());
    else throw new Error("what");
    if (!theRole) throw new DiscordRoleNotFoundError(roleId);

    await theMember.roles.add(theRole);
  }

  async unassignRole(serverId: string, userId: string, roleId?: string, roleName?: string) {
    const theServer = this.client.guilds.cache.get(serverId);
    if (!theServer) throw new DiscordServerNotFoundError(serverId);

    let theMember: GuildMember;
    try {
      theMember = await theServer.members.fetch(userId);
    } catch (e) {
      if (e.code === 10007 || e.code === 10013) {
        throw new DiscordMemberNotFoundError(userId);
      }
      else throw e;
    }

    let theRole: Role;
    if (roleId) theRole = theServer.roles.cache.get(roleId);
    else if (roleName) theRole = theServer.roles.cache.find((role) => role.name.toLowerCase() === roleName.toLowerCase());
    else throw new Error("what");
    if (!theRole) throw new DiscordRoleNotFoundError(roleId);

    await theMember.roles.remove(theRole);
  }

  async log(serverId: string, logChannelId: string, title: string, description: string) {
    const theServer = this.client.guilds.cache.get(serverId);
    if (!theServer) throw new DiscordServerNotFoundError(serverId);

    const theChannel = theServer.channels.cache.get(logChannelId);
    if (!theChannel) throw new DiscordChannelNotFoundError(logChannelId);

    if (theChannel.isTextBased()) {
      const embed = new EmbedBuilder().setTitle(title).setDescription(description);
      await theChannel.send({ embeds: [embed] });
    } else throw new DiscordChannelNotFoundError(logChannelId);
  }

  async assignAllPlayerRole(interaction: ChatInputCommandInteraction) {
    const tourney = await this.tournamentModel.findOne({ "discordSettings.serverId": interaction.guildId });

    if (!tourney) {
      await interaction.reply(`There seems to be no associated tournament in this context. Please run this command in a server associated with a tournament.`);
      return;
    }

    await tourney.populate([{ path: "staffMembers", populate: "roles" }, { path: "players" }]);

    const appUser = await this.appUserModel.findOne({ discordId: interaction.user.id });
    if (!appUser) {
      await interaction.reply("Who are you?");
      return;
    }

    const staffMember = tourney.staffMembers.find((staffMember) => staffMember.playerId === appUser.osuId);
    if (!staffMember || !staffMember.roles.some((role) => role.permissions.includes(`POST:/api/tournament/:acronym/player/:playerId`))) {
      await interaction.reply("You don't have permission to run this command for this tournament.");
      return;
    }

    const roleId = tourney.discordSettings.playerRoleId;
    const theRole = interaction.guild.roles.cache.get(roleId);
    if (!theRole) {
      await interaction.reply("Tournament does not have a player role ID specified.");
      return;
    }

    await interaction.reply("Not implemented yet.");

    const succeeded = [];
    const alreadyAdded = [];
    const failedNotLinked = [];
    const failedMemberNotFound = [];
    const failedMissingPermissions = [];
    for (const player of tourney.players) {
      const theAppUser = await this.appUserModel.findOne({ osuId: player.playerId });
      if (!theAppUser?.discordId) {
        failedNotLinked.push(player);
        continue;
      }
      
      const discordId = theAppUser.discordId;
      const theMember = await interaction.guild.members.fetch(discordId);
      if (!theMember) {
        failedMemberNotFound.push(player);
        continue;
      }
    }
  }
}