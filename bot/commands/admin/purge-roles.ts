
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';

const PurgeRolesCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('purge-roles')
        .setDescription('Supprime tous les rôles qui ne sont assignés à aucun membre.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Fetch all roles and members
            await interaction.guild.members.fetch();
            const allRoles = await interaction.guild.roles.fetch();

            const unusedRoles = allRoles.filter(role =>
                !role.managed && // Not managed by an integration
                role.name !== '@everyone' && // Not the @everyone role
                role.members.size === 0 // No members have this role
            );

            if (unusedRoles.size === 0) {
                await interaction.editReply({ content: 'Aucun rôle inutilisé n\'a été trouvé.' });
                return;
            }

            const roleList = unusedRoles.map(r => r.name).join('\n') || 'Aucun';

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('Confirmation de Purge des Rôles')
                .setDescription(`Êtes-vous sûr de vouloir supprimer définitivement les **${unusedRoles.size}** rôles suivants ? Cette action est irréversible.`)
                .addFields({ name: 'Rôles à supprimer', value: `\`\`\`\n${roleList.substring(0, 1000)}\n\`\`\`` });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('confirm_purge').setLabel('Confirmer la Suppression').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_purge').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
            );

            const confirmationMessage = await interaction.editReply({ embeds: [embed], components: [row] });

            const collector = confirmationMessage.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 30000, // 30 seconds
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_purge') {
                    await i.update({ content: 'Suppression en cours...', embeds: [], components: [] });
                    let deletedCount = 0;
                    for (const role of unusedRoles.values()) {
                        try {
                            await role.delete('Purge des rôles inutilisés.');
                            deletedCount++;
                        } catch (err) {
                            console.warn(`Impossible de supprimer le rôle ${role.name}:`, err);
                        }
                    }
                    await i.followUp({ content: `✅ ${deletedCount} rôles sur ${unusedRoles.size} ont été supprimés.`, ephemeral: true });
                } else {
                    await i.update({ content: 'Opération annulée.', embeds: [], components: [] });
                }
                collector.stop();
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Confirmation expirée.', embeds: [], components: [] });
                }
            });

        } catch (error) {
            console.error('[PurgeRoles] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la recherche des rôles.' });
        }
    },
};

export default PurgeRolesCommand;
