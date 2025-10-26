
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { db } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const PurgeActivityCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('purgeactivity')
        .setDescription("Purge les données d'activité de la communauté.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Purge toutes les données d\'activité pour ce serveur.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Purge les données d\'activité de TOUS les serveurs. (Propriétaire seulement)')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'all' && interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: "Cette sous-commande est exclusivement réservée au propriétaire du bot.", ephemeral: true });
            return;
        }

        const isPurgeAll = subcommand === 'all';
        const targetName = isPurgeAll ? "tous les serveurs" : `ce serveur (${interaction.guild.name})`;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('⚠️ Confirmation de Purge ⚠️')
            .setDescription(`Êtes-vous absolument sûr de vouloir purger toutes les données d'activité de **${targetName}** ?\n\nCette action est **irréversible** et supprimera l'historique des arrivées/départs et de l'activité des messages/vocaux.`)
            .setFooter({ text: "Cette opération ne peut pas être annulée." });
            
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_purge_${isPurgeAll ? 'all' : 'server'}`)
                .setLabel('Oui, purger les données')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_purge')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmationMessage = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

        const collector = confirmationMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'cancel_purge') {
                await i.update({ content: 'Opération annulée.', embeds: [], components: [] });
                collector.stop();
                return;
            }

            if (i.customId.startsWith('confirm_purge_')) {
                 await i.update({ content: 'Purge en cours...', embeds: [], components: [] });

                try {
                    if (isPurgeAll) {
                        db.prepare('DELETE FROM community_activity_stats').run();
                        db.prepare('DELETE FROM member_join_leave_events').run();
                        await i.followUp({ content: '✅ Toutes les données d\'activité de tous les serveurs ont été purgées.', ephemeral: true });
                    } else {
                        db.prepare('DELETE FROM community_activity_stats WHERE guild_id = ?').run(interaction.guild!.id);
                        db.prepare('DELETE FROM member_join_leave_events WHERE guild_id = ?').run(interaction.guild!.id);
                        await i.followUp({ content: `✅ Toutes les données d'activité pour **${interaction.guild!.name}** ont été purgées.`, ephemeral: true });
                    }
                } catch (error) {
                     console.error('[PurgeActivity] Error purging data:', error);
                     await i.followUp({ content: 'Une erreur est survenue lors de la purge des données.', ephemeral: true });
                }
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'La confirmation a expiré. Opération annulée.', embeds: [], components: [] });
            }
        });
    },
};

export default PurgeActivityCommand;
