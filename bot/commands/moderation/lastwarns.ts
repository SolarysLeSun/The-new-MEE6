

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getGuildWarnHistory } from '@/lib/db';

const WARNS_PER_PAGE = 6;

const LastWarnsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('lastwarns')
        .setDescription("Affiche l'historique des avertissements sur le serveur.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
        
        await interaction.deferReply();

        const history = getGuildWarnHistory(interaction.guild.id);

        if (history.length === 0) {
            await interaction.editReply("Il n'y a aucun avertissement enregistré sur ce serveur.");
            return;
        }
        
        const totalPages = Math.ceil(history.length / WARNS_PER_PAGE);

        const generateEmbed = async (page: number) => {
            const start = page * WARNS_PER_PAGE;
            const end = start + WARNS_PER_PAGE;
            const currentPageWarns = history.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle(`Historique des Avertissements du Serveur`)
                .setFooter({ text: `Page ${page + 1} sur ${totalPages} • Total : ${history.length} warns` });
            
            if(currentPageWarns.length === 0) {
                embed.setDescription("Aucun avertissement sur cette page.");
            }

            for (const warn of currentPageWarns) {
                 let userTag = warn.user_id;
                 try {
                     const user = await interaction.client.users.fetch(warn.user_id);
                     userTag = user.tag;
                 } catch (e) {
                     console.warn(`[LastWarns] Impossible de fetch l'utilisateur ${warn.user_id}`);
                 }
                
                 let moderatorTag = warn.moderator_id;
                 try {
                    if (warn.moderator_id !== 'AUTOMOD_IA') {
                        const moderator = await interaction.client.users.fetch(warn.moderator_id);
                        moderatorTag = moderator.tag;
                    }
                 } catch (e) {
                    console.warn(`[LastWarns] Impossible de fetch le modérateur ${warn.moderator_id}`);
                 }

                embed.addFields({
                    name: `Cas #${warn.id} | ${userTag} | <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:R>`,
                    value: `> **Raison :** ${warn.reason || 'Non spécifiée'}\n> **Modérateur :** ${moderatorTag}`
                });
            }
            return embed;
        }

        const embed = await generateEmbed(0);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('lastwarns_prev_0')
                    .setLabel('Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('lastwarns_next_0')
                    .setLabel('Suivant')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages <= 1)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};

export default LastWarnsCommand;
