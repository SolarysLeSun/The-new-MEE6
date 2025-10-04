
import { Events, GuildMember, EmbedBuilder } from 'discord.js';
import { createPremiumKey } from '../../../src/lib/db';
import ms from 'ms';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember: GuildMember, newMember: GuildMember) {
    const supportServerId = process.env.SUPPORT_SERVER_ID;
    if (!supportServerId || newMember.guild.id !== supportServerId) {
        return;
    }

    const wasBoosting = oldMember.premiumSinceTimestamp !== null;
    const isBoosting = newMember.premiumSinceTimestamp !== null;

    // User started boosting
    if (!wasBoosting && isBoosting) {
        console.log(`[Booster Reward] ${newMember.user.tag} a commencé à booster ${newMember.guild.name}.`);
        
        try {
            // Generate a 30-day premium key
            const expiresAt = new Date(Date.now() + ms('30d'));
            const premiumKey = createPremiumKey(newMember.id, expiresAt);

            const embed = new EmbedBuilder()
                .setColor(0xFF73FA) // Pink color for boosts
                .setTitle('🎉 Merci pour votre soutien ! 🎉')
                .setDescription(`Merci d'avoir boosté le serveur ! En guise de remerciement, voici une clé d'activation **Premium** pour le bot Marcus, valable 30 jours.`)
                .addFields(
                    { name: 'Votre Clé Premium', value: `\`\`\`${premiumKey}\`\`\`` },
                    { name: 'Comment l\'utiliser ?', value: `Allez sur le serveur où vous souhaitez activer le premium et utilisez la commande \`/set premium-key\` avec cette clé.` }
                )
                .setFooter({ text: 'Cette clé est à usage unique.' })
                .setTimestamp();
            
            await newMember.send({ embeds: [embed] });
            console.log(`[Booster Reward] Clé premium envoyée à ${newMember.user.tag}.`);

        } catch (error) {
            console.warn(`[Booster Reward] Impossible d'envoyer un DM de remerciement à ${newMember.user.tag}.`, error);
        }
    } 
}
