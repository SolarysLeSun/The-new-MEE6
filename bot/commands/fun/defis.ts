
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getDailyChallenges, getUserChallengeProgress } from '@/lib/db';

const DefisCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('defis')
        .setDescription('Affiche les défis quotidiens et votre progression.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'challenges');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de défis est désactivé sur ce serveur.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const challenges = getDailyChallenges(interaction.guild.id);
        const userProgress = getUserChallengeProgress(interaction.guild.id, interaction.user.id);
        
        if (challenges.length === 0) {
            await interaction.editReply({ content: "Les défis du jour n'ont pas encore été générés. Revenez plus tard !" });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Défis Quotidiens')
            .setColor(0x5865F2)
            .setTimestamp();
        
        for (const challenge of challenges) {
            const progress = userProgress.find(p => p.challenge_id === challenge.challenge_id);
            const isCompleted = progress?.completed || false;
            const currentProgress = progress?.progress || 0;
            
            const progressText = `${isCompleted ? '✅' : '▶️'} ${currentProgress} / ${challenge.goal}`;

            embed.addFields({
                name: `${challenge.description} (+${challenge.xp_reward} XP)`,
                value: `> ${progressText}`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export default DefisCommand;
