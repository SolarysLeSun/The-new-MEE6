
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, TextChannel } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig } from '../../../src/lib/db';
import { transcriptSummaryFlow } from '../../../src/ai/flows/transcript-summary-flow';

const PrivateResumCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('privateresum')
        .setDescription('Génère un résumé IA d\'un salon privé avant son archivage.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const privateRoomsConfig = await getServerConfig(interaction.guild.id, 'private-rooms');

        if (!privateRoomsConfig?.enabled || !privateRoomsConfig.archive_summary) {
            await interaction.editReply({ content: "La fonctionnalité de résumé IA pour les salons privés est désactivée." });
            return;
        }
        
        try {
            await interaction.editReply({ content: 'Lecture du salon en cours... Veuillez patienter.'});
            
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            const sortedMessages = Array.from(messages.values()).reverse();

            if (sortedMessages.length === 0) {
                await interaction.editReply({ content: "Il n'y a aucun message à résumer dans ce salon." });
                return;
            }

            const transcript = sortedMessages
                .map(msg => `${msg.author.tag}: ${msg.content}`)
                .join('\n');
            
            await interaction.editReply({ content: 'Génération du résumé par l\'IA... Ceci peut prendre un moment.'});

            const result = await transcriptSummaryFlow({ transcript });

            const embed = new EmbedBuilder()
                .setColor(0xf37349)
                .setTitle(`📝 Résumé IA du salon #${interaction.channel.name}`)
                .setDescription(result.summary)
                .setFooter({ text: `Basé sur les ${sortedMessages.length} derniers messages.` });
            
            await interaction.channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Résumé généré et envoyé dans ${interaction.channel}.` });

            // TODO: Optional - Add a button to the summary embed to confirm channel archival/deletion.

        } catch (error) {
            console.error('[PrivateResum] Error generating summary:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la génération du résumé.' });
        }
    },
};

export default PrivateResumCommand;
