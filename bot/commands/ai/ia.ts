
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getGlobalAiStatus } from '@/lib/db';
import { assistantFlow } from '@/ai/flows/assistant-flow';

const IaCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ia')
        .setDescription("Pose une question à l'assistant IA personnel.")
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Votre question, demande de correction, calcul, etc.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ 
                content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, 
                ephemeral: true 
            });
            return;
        }
        
        if (interaction.guild) {
            const config = await getServerConfig(interaction.guild.id, 'ai-assistant');
            if (!config?.enabled) {
                await interaction.reply({ 
                    content: "L'assistant IA est désactivé sur ce serveur.", 
                    ephemeral: true 
                });
                return;
            }
        }


        const prompt = interaction.options.getString('prompt', true);
        await interaction.deferReply({ ephemeral: true });

        try {
            const result = await assistantFlow({
                prompt: prompt,
                userName: interaction.user.username,
            });

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setAuthor({ name: `Pour : ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                .setTitle(`Votre question : "${prompt.substring(0, 250)}"`)
                .setDescription(result.response.substring(0, 4096));
                
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[IaCommand] Error executing assistantFlow:', error);
            await interaction.editReply({ content: 'Désolé, une erreur est survenue pendant que je réfléchissais. Veuillez réessayer.' });
        }
    },
};

export default IaCommand;
