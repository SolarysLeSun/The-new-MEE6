
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, Guild, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { db, getAllTesters, getAllPremiumGuilds } from '@/lib/db';
import { setTimeout } from 'timers/promises';

const OWNER_ID = '556529963877138442';
const SUPPORT_GUILD_ID = '1245654161282826260';
const TESTER_ROLE_ID = '1421561160246755410';
const PREMIUM_OWNER_ROLE_ID = '1421561161585004595';

const SyncSupportRolesCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('sync-roles')
        .setDescription('Synchronise les rôles Testeur et Premium sur le serveur de support. (Propriétaire seulement)')
        .setDMPermission(true),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.guildId !== SUPPORT_GUILD_ID) {
            await interaction.reply({ content: `Cette commande ne peut être utilisée que sur le serveur de support officiel de Marcus.`, flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const supportGuild = interaction.guild;
        if (!supportGuild) {
            await interaction.editReply({ content: 'Erreur critique : Impossible de trouver le serveur de support.'});
            return;
        }

        const stats = {
            testersAdded: 0,
            testersRemoved: 0,
            premiumAdded: 0,
            premiumRemoved: 0,
            errors: 0,
        };

        try {
            // --- Sync Testers ---
            const actualTesterIds = new Set(getAllTesters().map(t => t.user_id));
            const testerRole = await supportGuild.roles.fetch(TESTER_ROLE_ID);
            const membersWithTesterRole = testerRole?.members || new Map<string, GuildMember>();

            // Add role to new testers
            for (const userId of actualTesterIds) {
                if (!membersWithTesterRole.has(userId)) {
                    try {
                        const member = await supportGuild.members.fetch(userId).catch(() => null);
                        if (member) {
                            await member.roles.add(TESTER_ROLE_ID, 'Synchronisation automatique du statut Testeur');
                            stats.testersAdded++;
                        }
                    } catch(e) {
                         console.warn(`[SyncRoles] Could not add tester role to ${userId}:`, e);
                         stats.errors++;
                    }
                }
                 await setTimeout(200);
            }

            // Remove role from expired testers
            for (const member of membersWithTesterRole.values()) {
                if (!actualTesterIds.has(member.id)) {
                    try {
                        await member.roles.remove(TESTER_ROLE_ID, 'Le statut Testeur a expiré');
                        stats.testersRemoved++;
                    } catch(e) {
                        console.warn(`[SyncRoles] Could not remove tester role from ${member.id}:`, e);
                        stats.errors++;
                    }
                }
                 await setTimeout(200);
            }
            

            // --- Sync Premium Owners ---
            const premiumGuilds = getAllPremiumGuilds();
            const actualPremiumOwnerIds = new Set<string>();
            for (const guildInfo of premiumGuilds) {
                 try {
                    const guild = await interaction.client.guilds.fetch(guildInfo.guild_id);
                    actualPremiumOwnerIds.add(guild.ownerId);
                 } catch (e) {
                    console.warn(`[SyncRoles] Could not fetch guild ${guildInfo.guild_id} to find owner.`);
                 }
                 await setTimeout(100);
            }
            
            const premiumRole = await supportGuild.roles.fetch(PREMIUM_OWNER_ROLE_ID);
            const membersWithPremiumRole = premiumRole?.members || new Map<string, GuildMember>();

            // Add role to new premium owners
            for (const ownerId of actualPremiumOwnerIds) {
                if (!membersWithPremiumRole.has(ownerId)) {
                    try {
                        const member = await supportGuild.members.fetch(ownerId).catch(() => null);
                        if (member) {
                            await member.roles.add(PREMIUM_OWNER_ROLE_ID, 'Synchronisation automatique du statut Premium');
                            stats.premiumAdded++;
                        }
                    } catch(e) {
                        console.warn(`[SyncRoles] Could not add premium role to ${ownerId}:`, e);
                        stats.errors++;
                    }
                }
                 await setTimeout(200);
            }
            
            // Remove role from former premium owners
            for (const member of membersWithPremiumRole.values()) {
                 if (!actualPremiumOwnerIds.has(member.id)) {
                    try {
                         await member.roles.remove(PREMIUM_OWNER_ROLE_ID, 'Le statut Premium a expiré');
                         stats.premiumRemoved++;
                    } catch(e) {
                         console.warn(`[SyncRoles] Could not remove premium role from ${member.id}:`, e);
                         stats.errors++;
                    }
                }
                 await setTimeout(200);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('Rapport de Synchronisation des Rôles')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Rôle Testeur', value: `> <:Oui:1421563353888723084> Ajouté(s): **${stats.testersAdded}**\n> <:Non:1421563259537850471> Retiré(s): **${stats.testersRemoved}**`, inline: true },
                    { name: 'Rôle Premium', value: `> <:Oui:1421563353888723084> Ajouté(s): **${stats.premiumAdded}**\n> <:Non:1421563259537850471> Retiré(s): **${stats.premiumRemoved}**`, inline: true },
                    { name: 'Erreurs', value: `**${stats.errors}** erreur(s) rencontrée(s) (voir logs).`, inline: false },
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[SyncRoles] Error during role synchronization:', error);
            await interaction.editReply({ content: 'Une erreur majeure est survenue pendant la synchronisation.' });
        }
    },
};

export default SyncSupportRolesCommand;
