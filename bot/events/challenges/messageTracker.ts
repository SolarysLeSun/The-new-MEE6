
import { Events, Message, EmbedBuilder } from 'discord.js';
import { getServerConfig, updateUserChallengeProgress } from '@/lib/db';

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const config = await getServerConfig(message.guild.id, 'challenges');
    if (!config?.enabled) {
        return;
    }
    
    try {
        const completedChallenge = updateUserChallengeProgress(message.guild.id, message.author.id, 'MESSAGES_SENT', 1);

        if (completedChallenge) {
             const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🎉 Défi Terminé !')
                .setDescription(`Félicitations, vous avez terminé le défi : **${completedChallenge.description}**`)
                .addFields({ name: 'Récompense', value: `+${completedChallenge.xp_reward} XP` });
            
            // Try to send in DMs, fallback to channel
            try {
                await message.author.send({ embeds: [embed] });
            } catch (dmError) {
                await message.channel.send({ content: `${message.author}`, embeds: [embed] });
            }
        }
    } catch (error) {
        console.error(`[ChallengeTracker] Error updating message challenge progress for ${message.author.tag}:`, error);
    }
}
