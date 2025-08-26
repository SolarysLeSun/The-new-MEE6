
import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, getUserRank } from '@/lib/db';

const LevelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Affiche votre niveau actuel et votre progression.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription("L'utilisateur dont vous voulez voir le niveau.")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'leveling');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de niveaux est désactivé sur ce serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member || targetUser.bot) {
            await interaction.reply({ content: "Cet utilisateur n'est pas sur le serveur ou est un bot.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        try {
            const levelInfo = getUserLevel(targetUser.id, interaction.guild.id);
            const rank = getUserRank(targetUser.id, interaction.guild.id);

            const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/${interaction.guild.id}/${targetUser.id}`);
            cardUrl.searchParams.append('displayName', member.displayName);
            cardUrl.searchParams.append('avatarUrl', targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
            cardUrl.searchParams.append('level', levelInfo.level.toString());
            cardUrl.searchParams.append('xp', levelInfo.xp.toString());
            cardUrl.searchParams.append('requiredXp', levelInfo.requiredXp.toString());
            cardUrl.searchParams.append('rank', rank.toString());
            
            if (config.level_card_background_url) {
                 cardUrl.searchParams.append('backgroundUrl', config.level_card_background_url);
            }
             if (config.level_card_bar_color) {
                cardUrl.searchParams.append('barColor', config.level_card_bar_color);
            }
            if (config.level_card_text_color) {
                cardUrl.searchParams.append('textColor', config.level_card_text_color);
            }
            
            // It's better to just send the URL directly in an embed's image field.
            // Discord will proxy and cache it, which is much faster than fetching it ourselves.
            const embed = new EmbedBuilder()
                .setColor(config.level_card_bar_color ? parseInt(config.level_card_bar_color.replace('#', ''), 16) : 0x3498DB)
                .setAuthor({ name: `Statistiques de ${member.displayName}`, iconURL: targetUser.displayAvatarURL() || undefined })
                .setImage(cardUrl.toString())
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[LevelCommand] Error displaying level card:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'affichage de votre niveau.' });
        }
    },
};

export default LevelCommand;
