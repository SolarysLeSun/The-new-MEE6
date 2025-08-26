

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { banUserFromPanel, isUserBannedFromPanel } from '@/lib/db';

const LoginbanCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('loginban')
        .setDescription("Interdit à un utilisateur d'accéder au panel de configuration.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur à bannir du panel.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de cette interdiction.')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('utilisateur', true);
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const moderator = interaction.user;

        if (targetUser.id === moderator.id) {
            await interaction.reply({ content: 'Vous ne pouvez pas vous bannir vous-même du panel.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        if (targetUser.bot) {
             await interaction.reply({ content: 'Vous ne pouvez pas bannir un bot du panel.', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) {
             const moderatorMember = interaction.member as GuildMember;
             if(targetMember.roles.highest.position >= moderatorMember.roles.highest.position) {
                 await interaction.reply({ content: "Vous ne pouvez pas interdire l'accès au panel à un membre de rang égal ou supérieur.", flags: MessageFlags.Ephemeral });
                 return;
             }
        }
        
        try {
            if (isUserBannedFromPanel(interaction.guild.id, targetUser.id)) {
                 await interaction.reply({ content: `**${targetUser.tag}** est déjà banni de l'accès au panel.`, flags: MessageFlags.Ephemeral });
                 return;
            }

            banUserFromPanel(interaction.guild.id, targetUser.id, moderator.id, reason);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚫 Accès au Panel Révoqué')
                .setDescription(`**${targetUser.tag}** n'a désormais plus accès au panel de configuration.`)
                .addFields(
                    { name: 'Utilisateur', value: targetUser.toString(), inline: true },
                    { name: 'Modérateur', value: moderator.toString(), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('[Loginban] Error:', error);
            await interaction.reply({ content: "Une erreur est survenue lors de l'interdiction d'accès au panel.", flags: MessageFlags.Ephemeral });
        }
    },
};

export default LoginbanCommand;
