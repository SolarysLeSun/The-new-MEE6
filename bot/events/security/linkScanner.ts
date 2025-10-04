

'use server';

import { Events, Message, EmbedBuilder, TextChannel } from 'discord.js';
import { getServerConfig, getGlobalAiStatus } from '../../../src/lib/db';
import { linkScannerFlow } from '../../../src/ai/flows/link-scanner-flow';

const linkRegex = /https?:\/\/[^\s/$.?#].[^\s]*/i;

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    // Global AI check
    const globalAiStatus = getGlobalAiStatus();
    if (globalAiStatus.disabled) return;
    
    if (!message.guild || message.author.bot || !message.member) return;

    const config = await getServerConfig(message.guild.id, 'link-scanner');
    if (!config?.enabled || !config.premium) {
        return;
    }

    const linkMatch = message.content.match(linkRegex);
    if (!linkMatch || linkMatch.length === 0) {
        return;
    }
    
    const link = linkMatch[0]; // Analyze the first link found

    // Check for exempt roles
    const exemptRoles = config.exempt_roles || [];
     if (message.member.roles.cache.some(role => exemptRoles.includes(role.id))) {
        return;
    }
    
    try {
        console.log(`[Link-Scanner] Analyzing link from ${message.author.tag} in ${message.guild.name}.`);
        
        const result = await linkScannerFlow({
            messageContent: message.content,
            url: link,
            allow_nsfw: config.allow_nsfw_links || false
        });

        const shouldDelete = result.isSuspicious || (result.isNSFW && !config.allow_nsfw_links);

        if (shouldDelete) {
            console.log(`[Link-Scanner] Deleting message from ${message.author.tag}. Reason: ${result.reason}`);
            
            // Alert moderators if an alert channel is configured
            if (config.alert_channel_id) {
                const alertChannel = await message.guild.channels.fetch(config.alert_channel_id as string).catch(() => null) as TextChannel;
                if (alertChannel) {
                     const embed = new EmbedBuilder()
                        .setColor(0xFFA500) // Orange
                        .setTitle('🚨 Alerte Scanner de Liens IA 🚨')
                        .setDescription(`Un lien potentiellement dangereux ou inapproprié a été détecté et supprimé.`)
                        .addFields(
                            { name: 'Auteur', value: message.author.toString(), inline: true },
                            { name: 'Salon', value: message.channel.toString(), inline: true },
                            { name: 'Raison de la détection', value: result.reason, inline: false },
                            { name: 'Contenu du Message', value: `\`\`\`${message.content.substring(0, 1000)}\`\`\`` }
                        )
                        .setTimestamp()
                        .setFooter({ text: `ID Utilisateur: ${message.author.id}` });
                    
                    await alertChannel.send({ embeds: [embed] });
                }
            }

            // Take action based on config
            if (config.action === 'delete') {
                try {
                    await message.delete();
                    const replyMsg = await message.channel.send(`> **${message.author.toString()}, votre message a été supprimé par la modération automatique.** Raison : ${result.reason}.`);
                    setTimeout(() => replyMsg.delete().catch(() => {}), 10000);
                } catch (error: any) {
                    if (error.code !== 10008) { // Ignore "Unknown Message" error
                        console.error(`[Link-Scanner] Failed to delete message ${message.id}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Link-Scanner] Error during link analysis flow:', error);
    }
}

    