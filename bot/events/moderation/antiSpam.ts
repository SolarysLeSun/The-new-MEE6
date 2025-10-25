
import { Events, Message, Collection } from 'discord.js';
import { getServerConfig, recordSanction } from '@/lib/db';
import type { AutoModConfig } from '@/types';

// Collection pour suivre les messages récents des utilisateurs
// Structure: Map<guildId, Map<userId, { messageTimestamps: number[], lastMessageContent: string }>>
const userMessageHistory = new Collection<string, Collection<string, { messageTimestamps: number[], lastMessageContent: string | null }>>();

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot || !message.member) return;

    const config = await getServerConfig(message.guild.id, 'auto-moderation') as AutoModConfig;

    if (!config?.enabled || !config.anti_spam_enabled) {
        return;
    }

    // Vérifier les rôles et salons exemptés
    if (config.exempt_roles?.some(roleId => message.member!.roles.cache.has(roleId)) ||
        config.exempt_channels?.some(channelId => message.channel.id === channelId)) {
        return;
    }

    const now = Date.now();
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (!userMessageHistory.has(guildId)) {
        userMessageHistory.set(guildId, new Collection());
    }

    const guildHistory = userMessageHistory.get(guildId)!;

    if (!guildHistory.has(userId)) {
        guildHistory.set(userId, { messageTimestamps: [], lastMessageContent: null });
    }

    const userHistory = guildHistory.get(userId)!;
    const { message_limit = 5, time_window_seconds = 5, action = 'warn' } = config.anti_spam_settings || {};

    // Filtrer les timestamps qui sont hors de la fenêtre de temps
    userHistory.messageTimestamps = userHistory.messageTimestamps.filter(timestamp => now - timestamp < time_window_seconds * 1000);
    userHistory.messageTimestamps.push(now);
    
    let isSpam = false;
    let reason = '';
    
    // 1. Détection de Flood (messages rapides)
    if (userHistory.messageTimestamps.length > message_limit) {
        isSpam = true;
        reason = `Spam détecté (${userHistory.messageTimestamps.length} messages en moins de ${time_window_seconds} secondes).`;
    }
    
    // 2. Détection de messages répétitifs (si non déjà considéré comme du spam)
    if (!isSpam && message.content && message.content === userHistory.lastMessageContent) {
        isSpam = true;
        reason = 'Message répétitif détecté.';
    }

    userHistory.lastMessageContent = message.content;

    if (isSpam) {
        console.log(`[Anti-Spam] Action contre ${message.author.tag} sur ${message.guild.name}. Raison: ${reason}`);

        // Prendre une sanction
        switch (action) {
            case 'delete':
                // Supprimer les messages de la fenêtre de temps
                const messagesToDelete = await message.channel.messages.fetch({ limit: 20 });
                const userMessages = messagesToDelete.filter(m => m.author.id === userId && now - m.createdTimestamp < time_window_seconds * 1000);
                if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    await message.channel.bulkDelete(userMessages).catch(console.error);
                }
                break;
            case 'warn':
                await message.delete().catch(console.error);
                recordSanction({
                    guild_id: guildId,
                    user_id: userId,
                    moderator_id: 'AUTOMOD',
                    action_type: 'warn',
                    reason: reason
                });
                const warnMsg = await message.channel.send(`${message.author}, veuillez ne pas spammer.`);
                setTimeout(() => warnMsg.delete().catch(console.error), 5000);
                break;
        }

        // Réinitialiser l'historique de l'utilisateur pour éviter les sanctions multiples
        userHistory.messageTimestamps = [];
    }

    // Nettoyage périodique pour les utilisateurs inactifs
    setTimeout(() => {
        if (guildHistory.has(userId)) {
            const history = guildHistory.get(userId);
            if (history && history.messageTimestamps.length > 0 && (Date.now() - history.messageTimestamps[history.messageTimestamps.length-1] > time_window_seconds * 2000)) {
                 guildHistory.delete(userId);
            }
        }
    }, time_window_seconds * 2000);
}
