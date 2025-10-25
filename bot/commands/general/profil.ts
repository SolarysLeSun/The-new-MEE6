
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command, ProfileLink } from '@/types';
import { getUserProfile, getCombinedUserLevel, getServerConfig } from '@/lib/db';

const ProfilCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription("Affiche votre profil ou celui d'un autre utilisateur.")
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur dont vous voulez voir le profil.")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const config = getServerConfig(interaction.guildId!, 'utils');
        if (!config?.command_enabled?.profil) {
            await interaction.reply({ content: "Cette commande est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;

        await interaction.deferReply();

        try {
            const profile = getUserProfile(targetUser.id);
            const totalLevel = getCombinedUserLevel(targetUser.id);

            const embed = new EmbedBuilder()
                .setColor(0xf37349)
                .setAuthor({ name: `Profil de ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() || undefined })
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }) || null);

            if (profile?.bio) {
                embed.setDescription(profile.bio);
            } else {
                embed.setDescription("Aucune biographie définie. Utilisez `/setprofil` pour en ajouter une !");
            }
            
            embed.addFields({ name: '👑 Niveau Royal (Cumulé)', value: `Niveau **${totalLevel}**`, inline: true });
            
            const components: ActionRowBuilder<ButtonBuilder>[] = [];
            if (profile?.links && profile.links.length > 0) {
                const row = new ActionRowBuilder<ButtonBuilder>();
                profile.links.forEach((link: ProfileLink) => {
                    if (link.label && link.url) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setLabel(link.label)
                                .setURL(link.url)
                                .setStyle(ButtonStyle.Link)
                        );
                    }
                });
                if (row.components.length > 0) {
                    components.push(row);
                }
            }
            
            await interaction.editReply({ embeds: [embed], components });

        } catch (error) {
            console.error('[ProfilCommand] Error fetching profile:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de la récupération du profil." });
        }
    },
};

export default ProfilCommand;
