
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, TextChannel, MessageFlags } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, clearUserWarns } from '../../../src/lib/db';

const ClearWarnsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription("Supprime tous les avertissements d'un utilisateur sur ce serveur.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur dont les avertissements doivent être effacés.")
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'moderation');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de modération est désactivé sur ce serveur.", flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('utilisateur', true);
        const moderator = interaction.user;

        await interaction.deferReply({ ephemeral: true });

        try {
            const deletedCount = clearUserWarns(interaction.guild.id, targetUser.id);

            const replyEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✅ Les **${deletedCount}** avertissement(s) de **${targetUser.tag}** ont été supprimés.`);
            
            await interaction.editReply({ embeds: [replyEmbed] });
            
            // Log the action
            if (config.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.log_channel_id as string) as TextChannel;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x00BFFF)
                        .setTitle('Action de Modération : Purge d\'Avertissements')
                        .addFields(
                            { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: 'Modérateur', value: `${moderator.tag} (${moderator.id})`, inline: false },
                            { name: 'Avertissements supprimés', value: `${deletedCount}`, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'ID de l\'utilisateur: ' + targetUser.id });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

        } catch (error) {
            console.error('[ClearWarns] Error clearing warns:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de la suppression des avertissements." });
        }
    },
};

export default ClearWarnsCommand;
