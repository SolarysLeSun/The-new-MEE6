
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, TextChannel } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig } from '../../../src/lib/db';
import { transcriptSummaryFlow } from '../../../src/ai/flows/transcript-summary-flow';

const IaResumeCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('iaresume')
        .setDescription("Génère un résumé IA de la conversation récente dans ce salon.")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel.', ephemeral: true });
            return;
        }
        
        const config = await getServerConfig(interaction.guild.id, 'community-assistant');

        if (!config?.enabled || !config.premium) {
            await interaction.reply({ content: "La fonctionnalité de résumé IA est une exclusivité Premium et doit être activée dans le module 'Assistant Communautaire'.", ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        
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
            
            await interaction.channel.send({ content: `Voici un résumé de la conversation demandé par ${interaction.user.toString()} :`, embeds: [embed] });
            await interaction.editReply({ content: `✅ Résumé généré et envoyé dans ${interaction.channel}.` });

        } catch (error) {
            console.error('[IaResumeCommand] Error generating summary:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la génération du résumé.' });
        }
    },
};

export default IaResumeCommand;
