
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { unbanUserFromPanel, isUserBannedFromPanel } from '@/lib/db';

const LoginunbanCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('loginunban')
        .setDescription('Autorise de nouveau un utilisateur à accéder au panel de configuration.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à qui redonner l\'accès.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('utilisateur', true);
        const moderator = interaction.user;

        try {
            if (!isUserBannedFromPanel(interaction.guild.id, targetUser.id)) {
                 await interaction.reply({ content: `**${targetUser.tag}** n'est pas banni de l'accès au panel.`, flags: MessageFlags.Ephemeral });
                 return;
            }

            unbanUserFromPanel(interaction.guild.id, targetUser.id);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Accès au Panel Restauré')
                .setDescription(`**${targetUser.tag}** peut de nouveau accéder au panel de configuration.`)
                .addFields(
                    { name: 'Utilisateur', value: targetUser.toString(), inline: true },
                    { name: 'Modérateur', value: moderator.toString(), inline: true }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('[Loginunban] Error:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la restauration d\'accès au panel.', flags: MessageFlags.Ephemeral });
        }
    },
};

export default LoginunbanCommand;
