

import { Events, Guild, TextChannel, EmbedBuilder, ChannelType, Client } from 'discord.js';
import { setupDefaultConfigs, isBotBanned, hasClaimedTrial, claimTrial, setPremiumStatus } from '@/lib/db';
import { updateGuildCommands } from '../../handlers/commandHandler';
import ms from 'ms';

/**
 * This event handler is triggered whenever the bot joins a new guild.
 * It ensures that the new guild is set up with all the
 * default configurations for every module, sends a welcome message,
 * and deploys all guild-specific slash commands.
 */
export const name = Events.GuildCreate;

export async function execute(guild: Guild, client: Client) {
    console.log(`[+] Joined a new guild: ${guild.name} (${guild.id}).`);
    
    // --- Security Check ---
    const ownerId = guild.ownerId;
    if (isBotBanned(ownerId)) {
        console.log(`[Security] Owner of guild ${guild.name} (${ownerId}) is bot-banned. Leaving server.`);
        try {
            const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me!)?.has('SendMessages')) as TextChannel;
            if (channel) {
                await channel.send("Le propriétaire de ce serveur est banni de l'utilisation de Marcus. Le bot va maintenant quitter le serveur.");
            }
        } catch (error) {
            console.error("Could not send ban message before leaving guild.", error);
        }
        await guild.leave();
        return;
    }


    // --- 1. Setup Database ---
    console.log(`[Database] Setting up default configurations for ${guild.name}...`);
    try {
        await setupDefaultConfigs(guild.id);
        console.log(`[Database] Successfully set up default configurations for ${guild.name}.`);
    } catch (error) {
        console.error(`[Database] Failed to set up default configurations for guild ${guild.id}:`, error);
    }
    
    // --- 2. Deploy Guild Commands ---
    // This is crucial to make commands available immediately on join.
    console.log(`[Commands] Deploying commands for the new guild: ${guild.name}`);
    await updateGuildCommands(guild.id, client);


    // --- 3. Send Welcome Message & Trial ---
    let welcomeChannel: TextChannel | undefined;
    const owner = await guild.fetchOwner();

    try {
        welcomeChannel = guild.channels.cache.find(channel => 
            channel.type === ChannelType.GuildText && 
            guild.members.me?.permissionsIn(channel).has('SendMessages')
        ) as TextChannel;

        let welcomeEmbed: EmbedBuilder;

        // Check for trial
        if (!hasClaimedTrial(ownerId)) {
            const trialExpiry = new Date(Date.now() + ms('3h'));
            setPremiumStatus(guild.id, true, trialExpiry);
            claimTrial(ownerId);

            welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`🎉 Merci d'avoir choisi Marcus pour ${guild.name} !`)
                .setDescription(`Bonjour ${owner.user.toString()} ! Pour vous souhaiter la bienvenue, j'ai activé un **essai Premium de 3 heures** pour ce serveur.`)
                .addFields(
                    {
                        name: '🚀 Pour commencer',
                        value: 'Utilisez `/login` pour accéder au panel de configuration. Je vous recommande de tester en priorité l\'**Agent Conversationnel IA** !',
                    },
                     {
                        name: '✨ Expire dans 3 heures',
                        value: `Votre essai se terminera <t:${Math.floor(trialExpiry.getTime() / 1000)}:R>.`
                    }
                )
                .setFooter({ text: "Profitez bien de toutes les fonctionnalités !" });
            
            console.log(`[Trial] Granted 3-hour premium trial to guild ${guild.id} for owner ${ownerId}.`);

        } else {
            welcomeEmbed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle(`👋 Merci de m'avoir ajouté sur ${guild.name} !`)
                .setDescription(`Bonjour ! Je suis **Marcus**, votre nouvel assistant pour gérer et animer votre serveur.`)
                .addFields(
                    { 
                        name: '🚀 Pour commencer', 
                        value: 'Pour accéder au panel de configuration web, un administrateur doit simplement taper la commande suivante dans n\'importe quel salon :\n\n`/login`\n\nCela générera un lien de connexion unique et sécurisé pour configurer tous mes modules.',
                    }
                )
                .setFooter({ text: 'J\'ai hâte de vous aider !' });
        }


        if (welcomeChannel) {
            await welcomeChannel.send({ embeds: [welcomeEmbed] });
            console.log(`[Welcome] Sent introduction message to #${welcomeChannel.name} in ${guild.name}.`);
        } else {
             console.log(`[Welcome] Could not find a suitable channel, sending welcome DM to owner ${owner.user.tag}.`);
             await owner.send({ embeds: [welcomeEmbed] });
        }
    } catch (error) {
        console.error(`[Welcome/Trial] Failed to send welcome message to guild ${guild.id}:`, error);
    }
}
