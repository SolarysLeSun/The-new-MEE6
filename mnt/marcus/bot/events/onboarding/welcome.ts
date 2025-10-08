
import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig } from '../../../src/lib/db';
import type { WelcomeConfig } from '@/types';

// Le nom de l'événement Discord que nous écoutons
export const name = Events.GuildMemberAdd;

// La fonction qui sera exécutée
export async function execute(member: GuildMember) {
    // Ignore les bots
    if (member.user.bot) return;

    // 1. Récupérer la configuration du module pour ce serveur
    const config = await getServerConfig(member.guild.id, 'welcome-message') as WelcomeConfig | null;

    // 2. Vérifier si le module est activé et bien configuré
    if (!config?.enabled || !config.welcome_channel_id) {
        return;
    }

    // 3. Récupérer le salon configuré
    const channel = await member.guild.channels.fetch(config.welcome_channel_id).catch(() => null) as TextChannel;
    if (!channel) return;
    
    let welcomeMessage = config.welcome_message.replace('{user}', member.toString());

    // --- Envoi en message privé ---
    if (config.send_in_dm) {
        try {
            await member.send(`**Message de la part du serveur ${member.guild.name} :**\n${welcomeMessage}`);
        } catch(e) {
            console.warn(`[Welcome] Impossible d'envoyer le message de bienvenue en DM à ${member.user.tag}`);
        }
    }


    // --- Envoi dans le salon ---
    if (config.use_card) {
        // --- Generate Card ---
        try {
            const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/welcome/${member.guild.id}/${member.id}`);
            cardUrl.searchParams.append('displayName', member.displayName);
            cardUrl.searchParams.append('username', member.user.username);
            cardUrl.searchParams.append('avatarUrl', member.user.displayAvatarURL({ extension: 'png', size: 256 }));
            cardUrl.searchParams.append('serverName', member.guild.name);
            cardUrl.searchParams.append('memberCount', member.guild.memberCount.toString());
            cardUrl.searchParams.append('welcomeText', config.welcome_message);
            if (config.card_background_url) {
                cardUrl.searchParams.append('backgroundUrl', config.card_background_url);
            }
            if (config.card_text_color) {
                cardUrl.searchParams.append('textColor', config.card_text_color);
            }
            
            const embed = new EmbedBuilder()
                .setColor(config.card_text_color ? parseInt(config.card_text_color.replace('#', ''), 16) : 0x3498DB)
                .setImage(cardUrl.toString())
                .setDescription(welcomeMessage); // Also send the text for accessibility

            await channel.send({ content: welcomeMessage, embeds: [embed] });

        } catch (error) {
             console.error(`[WelcomeCard] Could not generate or send welcome card for ${member.user.tag}:`, error);
             // Fallback to text message on card error
             await channel.send(welcomeMessage);
        }

    } else {
        // --- Send Text Message Only ---
        await channel.send(welcomeMessage);
    }
}
