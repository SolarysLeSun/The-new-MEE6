
import { Events, Message, TextChannel } from 'discord.js';
import { getServerConfig } from '@/lib/db';
import { Collection } from 'discord.js';

const usersToVerify = new Collection<string, string>(); // <userId, captchaCode>

export function addCaptchaToVerify(userId: string, code: string) {
    usersToVerify.set(userId, code);
    // Remove the user from the verification process after 15 minutes to prevent memory leaks
    setTimeout(() => {
        if(usersToVerify.has(userId)) {
             console.log(`[Captcha] Verification timed out for user ${userId}.`);
             usersToVerify.delete(userId);
        }
    }, 15 * 60 * 1000);
}

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (message.author.bot || !message.guild || !message.content || !message.member) return;

    const captchaConfig = await getServerConfig(message.guild.id, 'captcha');
    
    // Only listen in the designated verification channel
    if (!captchaConfig?.enabled || message.channel.id !== captchaConfig.verification_channel) {
        return;
    }

    const userId = message.author.id;

    // Check if the user is in the verification process
    if (!usersToVerify.has(userId)) {
        // If not in verification, delete their message in this channel
        try {
            await message.delete();
        } catch (e) {
            console.warn(`[Captcha] Could not delete message from ${userId} in verification channel.`);
        }
        return;
    }

    const expectedCode = usersToVerify.get(userId);
    
    if (message.content === expectedCode) {
        // Correct code
        console.log(`[Captcha] User ${userId} successfully verified.`);
        usersToVerify.delete(userId);

        try {
            const role = await message.guild.roles.fetch(captchaConfig.verified_role_id!);
            if (role) {
                await message.member.roles.add(role);
                const successMsg = await message.channel.send(`✅ ${message.author}, vérification réussie ! Vous avez maintenant accès au serveur.`);
                setTimeout(() => successMsg.delete().catch(() => {}), 5000);
            } else {
                 console.error(`[Captcha] Verified role with ID ${captchaConfig.verified_role_id} not found.`);
            }
        } catch (error) {
            console.error('[Captcha] Error assigning verified role:', error);
        }

    } else {
        // Incorrect code, delete the message
        console.log(`[Captcha] User ${userId} entered incorrect code.`);
        try {
            await message.delete();
        } catch (e) {
             console.warn(`[Captcha] Could not delete incorrect code message from ${userId}.`);
        }
    }
}
