
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, Guild } from 'discord.js';
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
            testersKept: 0,
            premiumAdded: 0,
            premiumKept: 0,
            errors: 0,
        };

        try {
            // --- Sync Testers ---
            const allTesters = getAllTesters();
            const testerUserIds = new Set(allTesters.map(t => t.user_id));

            for (const userId of testerUserIds) {
                try {
                    const member = await supportGuild.members.fetch(userId).catch(() => null);
                    if (member) {
                        if (!member.roles.cache.has(TESTER_ROLE_ID)) {
                            await member.roles.add(TESTER_ROLE_ID);
                            stats.testersAdded++;
                        } else {
                            stats.testersKept++;
                        }
                    }
                } catch (e) {
                    console.warn(`[SyncRoles] Could not process tester ${userId}:`, e);
                    stats.errors++;
                }
                 await setTimeout(200); // Rate limit
            }

            // --- Sync Premium Owners ---
            const premiumGuilds = getAllPremiumGuilds();
            const premiumOwnerIds = new Set<string>();
            
            for (const guildInfo of premiumGuilds) {
                 try {
                    const guild = await interaction.client.guilds.fetch(guildInfo.guild_id);
                    premiumOwnerIds.add(guild.ownerId);
                 } catch (e) {
                    console.warn(`[SyncRoles] Could not fetch guild ${guildInfo.guild_id} to find owner. It might have been deleted.`);
                 }
                 await setTimeout(100); // Rate limit
            }

            for (const ownerId of premiumOwnerIds) {
                 try {
                    const member = await supportGuild.members.fetch(ownerId).catch(() => null);
                    if (member) {
                        if (!member.roles.cache.has(PREMIUM_OWNER_ROLE_ID)) {
                            await member.roles.add(PREMIUM_OWNER_ROLE_ID);
                            stats.premiumAdded++;
                        } else {
                            stats.premiumKept++;
                        }
                    }
                } catch (e) {
                    console.warn(`[SyncRoles] Could not process premium owner ${ownerId}:`, e);
                    stats.errors++;
                }
                 await setTimeout(200);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('Rapport de Synchronisation des Rôles')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Rôle Testeur', value: `> Ajouté à **${stats.testersAdded}** membre(s).\n> Déjà présent sur **${stats.testersKept}** membre(s).`, inline: true },
                    { name: 'Rôle Premium', value: `> Ajouté à **${stats.premiumAdded}** membre(s).\n> Déjà présent sur **${stats.premiumKept}** membre(s).`, inline: true },
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

    