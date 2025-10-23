

import { Events, Message, Collection, ChannelType, PermissionFlagsBits } from 'discord.js';
import { getServerConfig, updateUserXP, getOwnerXPBoost } from '@/lib/db';

const userCooldowns = new Collection<string, number>();
const OWNER_ID = '556529963877138442';

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || !message.author || message.author.bot) return;

    const config = await getServerConfig(message.guild.id, 'leveling');
    if (!config?.enabled || !config.xp_per_message || config.xp_per_message <= 0) {
        return;
    }

    const channelForXpCheck = message.channel.isThread() ? await message.channel.parent?.fetch() : message.channel;
    if (!channelForXpCheck) return;

    if (config.ignored_channels?.includes(channelForXpCheck.id)) {
        return;
    }

    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const cooldownTime = (config.cooldown_seconds || 60) * 1000;

    if (userCooldowns.has(cooldownKey)) {
        const expirationTime = userCooldowns.get(cooldownKey) as number;
        if (now < expirationTime) {
            return; // User is on cooldown
        }
    }

    userCooldowns.set(cooldownKey, now + cooldownTime);

    let xpToGive = config.xp_per_message || 15;

    // --- Admin boost (permanent x2) ---
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        xpToGive *= 2;
    }

    // --- Global Owner Boost ---
    if (message.author.id === OWNER_ID) {
        const ownerMultiplier = getOwnerXPBoost();
        if (ownerMultiplier > 1) {
            xpToGive *= ownerMultiplier;
        }
    }

    // --- Check for channel boosts ---
    const channelBoost = config.xp_boost_channels?.find((c: any) => c.channel_id === channelForXpCheck.id);
    if (channelBoost) {
        xpToGive *= channelBoost.multiplier;
    }

    // --- Check for role boosts ---
    const memberRoles = message.member?.roles.cache.map(r => r.id) || [];
    let highestRoleMultiplier = 1;
    if (config.xp_boost_roles) {
        config.xp_boost_roles.forEach((boost: any) => {
            if (memberRoles.includes(boost.role_id) && boost.multiplier > highestRoleMultiplier) {
                highestRoleMultiplier = boost.multiplier;
            }
        });
    }
    xpToGive *= highestRoleMultiplier;

    updateUserXP(message.author.id, message.guild.id, Math.round(xpToGive));
}
