
import { Client, GatewayIntentBits, Events, ActivityType, Collection, PermissionFlagsBits, MessageFlags, ChannelType, OverwriteType, EmbedBuilder, TextChannel, ModalSubmitInteraction, Interaction, ButtonInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuInteraction } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { loadCommands, updateGuildCommands, deployGlobalCommands } from './handlers/commandHandler';
import type { Command, CustomField } from '@/types';
import { initializeDatabase, syncGuilds, getServerConfig, setupDefaultConfigs, updateServerConfig, setClientInstance, getAllBotServers } from '@/lib/db';
import { startApi, addBotLog } from './api';
import { v4 as uuidv4 } from 'uuid';
import { startVoiceXPInterval } from './events/leveling/voiceXP';
import { startScheduledSuggestions } from './events/system/scheduledSuggestions';
import { generateTextContent } from '@/ai/flows/content-creation-flow';
import { announcementFlow } from '@/ai/flows/announcement-flow';
import { autoTranslateFlow } from '@/ai/flows/auto-translate-flow';
import { handleOnboardingResponse } from './events/onboarding/aiOnboarding';
import { patchNoteFlow } from '@/ai/flows/patchnote-flow';
import ms from 'ms';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// --- Initialize Database First ---
// This is critical to ensure all tables exist before any other code tries to access them.
initializeDatabase();
// ---------------------------------

addBotLog('Bot is starting...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
    ]
});

// Extend the client object to hold our commands
declare module "discord.js" {
    export interface Client {
        commands: Collection<string, Command>;
    }
}

client.commands = new Collection<string, Command>();

// Pass client instance to the database module for event emitting
setClientInstance(client);

// Load Event Handlers
const loadEvents = (client: Client) => {
    const eventsPath = path.join(__dirname, 'events');
    const traverseDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                traverseDirectory(fullPath);
            } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                 try {
                    const event = require(fullPath);
                     if (event.name && event.execute) {
                        if (event.once) {
                            client.once(event.name, (...args) => event.execute(...args, client));
                        } else {
                            client.on(event.name, (...args) => event.execute(...args, client));
                        }
                        addBotLog(`[Event] Loaded: ${event.name} from ${path.relative(eventsPath, fullPath)}`);
                     }
                 } catch(e) {
                    addBotLog(`[Error] Failed to load event at ${fullPath}: ${e}`);
                 }
            }
        }
    };
    traverseDirectory(eventsPath);
};

loadEvents(client);


client.once(Events.ClientReady, async (readyClient) => {
    addBotLog(`Ready! Logged in as ${readyClient.user.tag}`);
    
    // Set the bot's presence
    readyClient.user.setPresence({
        activities: [{ name: `marcusbot.fr`, type: ActivityType.Playing }],
        status: 'online',
    });
    
    // Load all command modules into the client
    loadCommands(client);
    
    // Deploy global commands (owner-only)
    await deployGlobalCommands(client);

    // Sync guilds with the database and deploy guild-specific commands
    await syncGuilds(readyClient);
    for (const guild of readyClient.guilds.cache.values()) {
        await updateGuildCommands(guild.id, client);
    }
    
    // Start interval for voice XP gain
    startVoiceXPInterval(client);

    // Start interval for scheduled suggestions
    startScheduledSuggestions(client);
    
    // Start the API for the web panel at the very end
    startApi(client);
});

async function handleSuggestionModal(interaction: ModalSubmitInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });
    
    const config = await getServerConfig(interaction.guild.id, 'suggestions');
    if (!config?.enabled || !config.suggestion_channel_id) {
        await interaction.editReply({ content: "Le système de suggestions est désactivé ou non configuré." });
        return;
    }

    const suggestionChannel = await interaction.guild.channels.fetch(config.suggestion_channel_id).catch(() => null) as TextChannel;
    if (!suggestionChannel) {
        await interaction.editReply({ content: "Le salon de suggestions configuré n'a pas été trouvé." });
        return;
    }

    const title = interaction.fields.getTextInputValue('suggestion_title');
    const description = interaction.fields.getTextInputValue('suggestion_description');

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Suggestion de ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined })
        .setTitle(title)
        .setDescription(description)
        .setColor(0xFF7300)
        .setTimestamp()
        .setFooter({ text: `ID Utilisateur: ${interaction.user.id}` });
        
    try {
        const message = await suggestionChannel.send({ embeds: [embed] });
        if (config.upvote_emoji) await message.react(config.upvote_emoji);
        if (config.downvote_emoji) await message.react(config.downvote_emoji);
        
        await interaction.editReply({ content: '<:Oui:1421563353888723084> Votre suggestion a été envoyée avec succès !' });
    } catch (e) {
        console.error("Failed to send suggestion", e);
        await interaction.editReply({ content: '<:Non:1421563259537850471> Une erreur est survenue lors de l\'envoi de votre suggestion.' });
    }
}

async function handleBotSuggestionModal(interaction: ModalSubmitInteraction) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });
    
    const developerId = '556529963877138442';
    const idea = interaction.fields.getTextInputValue('suggestion_bot_idea');

    try {
        const developer = await client.users.fetch(developerId);
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💡 Nouvelle suggestion pour Marcus !')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() || undefined })
            .addFields(
                { name: 'Suggestion', value: idea },
                { name: 'Serveur d\'origine', value: `${interaction.guild.name} (\`${interaction.guild.id}\`)` }
            )
            .setTimestamp();
        
        await developer.send({ embeds: [embed] });
        await interaction.editReply({ content: '<:Oui:1421563353888723084> Votre idée a bien été envoyée au développeur. Merci pour votre contribution !' });

    } catch (error) {
        console.error("Failed to send bot suggestion DM:", error);
        await interaction.editReply({ content: '<:Non:1421563259537850471> Une erreur est survenue lors de l\'envoi de votre idée. Le développeur a peut-être fermé ses messages privés.' });
    }
}

async function handleContentModificationModal(interaction: ModalSubmitInteraction) {
    if (!interaction.message || !interaction.message.embeds[0]) return;
    
    await interaction.deferReply({ ephemeral: true });

    const modificationRequest = interaction.fields.getTextInputValue('modification_request');
    const originalEmbed = interaction.message.embeds[0];
    const footerText = originalEmbed.footer?.text || '';

    let newEmbed: EmbedBuilder;

    if (footerText.includes('admin_announce') || footerText.includes('announce_channel')) {
        // --- Handle Announcement Modification ---
        try {
            const result = await announcementFlow({
                rawText: originalEmbed.description || '',
                authorName: originalEmbed.author?.name || interaction.user.username,
                modificationRequest: modificationRequest
            });

            newEmbed = EmbedBuilder.from(originalEmbed)
                .setTitle(result.title)
                .setDescription(result.description);
                
        } catch (error) {
            console.error('[AnnounceModify] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la modification de l\'annonce.', ephemeral: true });
            return;
        }

    } else {
         // --- Handle IA Content (Rule/Announcement) Modification ---
         if (!interaction.guild) {
            await interaction.editReply({ content: 'Cette action ne peut être effectuée en messages privés.', ephemeral: true });
            return;
         }
        const title = originalEmbed.title || '';
        const type = title.includes('Règle') ? 'rule' : 'announcement';
        const topic = title.replace(/^(📝 Règle : |📢 Annonce : )/i, '').replace(/"/g, '');

        const config = await getServerConfig(interaction.guild.id, 'content-ai');

        try {
            const result = await generateTextContent({
                type: type as 'rule' | 'announcement',
                topic: topic,
                tone: config.default_tone,
                customInstructions: originalEmbed.description || '', // Use the old description as context
                modificationRequest: modificationRequest // Pass the new modification request
            });

            newEmbed = EmbedBuilder.from(originalEmbed)
                .setDescription(result.generatedText.substring(0, 4096));

        } catch (error) {
            console.error('[ContentModify] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la modification du contenu.', ephemeral: true });
            return;
        }
    }

    await interaction.message.edit({ embeds: [newEmbed] });
    await interaction.editReply({ content: '<:Oui:1421563353888723084> Le contenu a été modifié. Vous pouvez le modifier à nouveau ou le publier.', ephemeral: true });
}

async function handleTranslationSelect(interaction: StringSelectMenuInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetLanguage = interaction.values[0];
    const messageId = interaction.customId.split('_')[2];

    try {
        const message = await interaction.channel?.messages.fetch(messageId);
        if (!message || !message.content) {
            await interaction.editReply({ content: 'Impossible de trouver le message original ou son contenu est vide.' });
            return;
        }

        const result = await autoTranslateFlow({
            textToTranslate: message.content,
            targetLanguage,
        });
        
        if (result.translatedText) {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`Traduction en ${targetLanguage}`)
                .addFields(
                    { name: 'Texte Original', value: `\`\`\`${message.content.substring(0, 1020)}\`\`\`` },
                    { name: 'Traduction', value: `\`\`\`${result.translatedText.substring(0, 1020)}\`\`\`` }
                )
                .setFooter({ text: `Traduit pour ${interaction.user.tag}` });
            await interaction.editReply({ embeds: [embed] });
        } else {
             await interaction.editReply({ content: 'Le texte est déjà dans la langue cible ou une erreur est survenue.' });
        }

    } catch (error) {
        console.error('[TranslateSelect] Error:', error);
        await interaction.editReply({ content: 'Une erreur est survenue lors de la traduction.' });
    }
}

async function handlePrivateRoomModal(interaction: ModalSubmitInteraction) {
    if (!interaction.guild || !interaction.member) return;
    const config = await getServerConfig(interaction.guild.id, 'private-rooms');

    if (!config || !config.enabled || !config.category_id) {
        await interaction.reply({ content: "Le système de salons privés n'est pas correctement configuré.", ephemeral: true });
        return;
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        const sanitizedUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'user';
        let channelName = config.channel_name_format || 'ticket-{user}';

        channelName = channelName
            .replace('{user}', sanitizedUsername)
            .replace('{mention}', interaction.user.toString())
            .replace('{id}', interaction.user.id)
            .replace('{random}', Math.random().toString(36).substring(2, 8));
        
        // Replace custom field variables
        for (let i = 0; i < (config.custom_fields?.length || 0); i++) {
            const field = config.custom_fields[i];
            if (!field.label) continue;
            const value = interaction.fields.getTextInputValue(field.id);
            channelName = channelName.replace(`{champ${i + 1}}`, value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        }

        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName && c.parentId === config.category_id);
        if(existingChannel) {
            await interaction.editReply(`Vous avez déjà un salon privé ouvert : ${existingChannel}`);
            return;
        }

        const channel = await interaction.guild.channels.create({
            name: channelName.slice(0, 100),
            type: ChannelType.GuildText,
            parent: config.category_id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
            ],
        });

        // Construct initial message with custom field values
        let initialMessage = `Bienvenue ${interaction.user}, votre salon privé a été créé.`;
        if (config.custom_fields?.length > 0) {
            initialMessage += "\n\n**Détails fournis :**";
            for (const field of config.custom_fields) {
                if (!field.label) continue;
                const value = interaction.fields.getTextInputValue(field.id);
                initialMessage += `\n**${field.label}:** ${value}`;
            }
        }
        
        await channel.send(initialMessage);
        await interaction.editReply(`Votre salon privé a été créé : ${channel}`);

    } catch (error) {
        console.error('[PrivateRoom] Error creating channel:', error);
        await interaction.editReply({ content: 'Une erreur est survenue lors de la création du salon.' });
    }
}

async function handleReminderButton(interaction: ButtonInteraction) {
    const [ , delayStr, destination, base64Message ] = interaction.customId.split('::');

    if (!delayStr || !destination || !base64Message) return;

    const delayMs = ms(delayStr);
    if (!delayMs) return;

    const reminderTime = Math.floor((Date.now() + delayMs) / 1000);

    await interaction.reply({ content: `<:Oui:1421563353888723084> D'accord ! Je vous rappellerai à nouveau ce message <t:${reminderTime}:R>.`, ephemeral: true });

    const message = Buffer.from(base64Message, 'base64').toString('utf-8');
    
    // This creates a new, independent reminder. It does not use the expired interaction.
    setTimeout(async () => {
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('⏰ C\'est l\'heure ! (Relance)')
            .setDescription(`Il y a **${delayStr}** (<t:${Math.floor(Date.now()/1000 - delayMs/1000)}:R>), vous m'avez demandé de vous rappeler ceci :`)
            .addFields({ name: 'Votre message', value: message })
            .setTimestamp(reminderTime * 1000);
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(interaction.customId) // Reuse the same customId for further rescheduling
                .setLabel('Relancer le rappel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        try {
            if (destination === 'mp') {
                await interaction.user.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
            } else if (interaction.channel) {
                 const originalChannel = await client.channels.fetch(interaction.channelId).catch(() => null);
                 if (originalChannel && originalChannel.isTextBased()) {
                     await originalChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
                 }
            }
        } catch (error) {
            console.error('[Rappel-Relance] Erreur lors de l\'envoi du rappel :', error);
        }
    }, delayMs);
}


client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.channel.type === ChannelType.DM) {
        await handleOnboardingResponse(message);
    }
});


client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
        return;
    }
    
    // Handle Modals
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'suggestion_modal_server') {
            await handleSuggestionModal(interaction);
        } else if (interaction.customId === 'suggestion_modal_bot') {
            await handleBotSuggestionModal(interaction);
        } else if (interaction.customId === 'content_modification_modal') {
             await handleContentModificationModal(interaction);
        } else if (interaction.customId === 'private_room_modal') {
            await handlePrivateRoomModal(interaction);
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('translate_select_')) {
            await handleTranslationSelect(interaction);
        }
        return;
    }

    if (interaction.isButton()) {
        addBotLog(`[Interaction] Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
        const { customId } = interaction;

        // --- Reminder Button Handler ---
        if (customId.startsWith('reschedule_reminder::')) {
            await handleReminderButton(interaction);
            return;
        }

        // --- Handler for Anti-Bot Buttons ---
        if (customId.startsWith('approve_bot_') || customId.startsWith('deny_bot_')) {
            await interaction.deferUpdate();
            const isApproval = customId.startsWith('approve_bot_');
            const botId = customId.substring(isApproval ? 'approve_bot_'.length : 'deny_bot_'.length);

            if (!interaction.guild || !interaction.member) return;
            
            // Permission check: only members with Administrator permissions can approve/deny.
            if (!(interaction.member.permissions as any).has(PermissionFlagsBits.Administrator)) {
                 await interaction.followUp({ content: 'Vous n\'avez pas la permission d\'effectuer cette action.', flags: MessageFlags.Ephemeral });
                 return;
            }
            
            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed);

            if (isApproval) {
                const antibotConfig = await getServerConfig(interaction.guild.id, 'anti-bot');
                const whitelistedBots = (antibotConfig?.whitelisted_bots as string[]) || [];
                if (!whitelistedBots.includes(botId)) {
                    whitelistedBots.push(botId);
                    updateServerConfig(interaction.guild.id, 'anti-bot', { ...antibotConfig, whitelisted_bots: whitelistedBots });
                }
                newEmbed.setColor(0x00FF00).setFooter({ text: `Approuvé par ${interaction.user.tag}` });
            } else { // Denial
                try {
                    const memberToKick = await interaction.guild.members.fetch(botId);
                    await memberToKick.kick('Approbation de bot refusée.');
                    newEmbed.setColor(0xFF0000).setFooter({ text: `Refusé et expulsé par ${interaction.user.tag}` });
                } catch (error) {
                    console.error(`[Anti-Bot] Failed to kick bot ${botId} on denial:`, error);
                    newEmbed.setColor(0xFF0000).setFooter({ text: `Refusé par ${interaction.user.tag} (expulsion échouée)` });
                }
            }
            // Disable buttons after action
            await interaction.message.edit({ embeds: [newEmbed], components: [] });
            return;
        }

        // --- Handler for Suggestion Button ---
        if (customId === 'create_suggestion') {
            await interaction.deferReply({ ephemeral: true });
            const config = await getServerConfig(interaction.guild!.id, 'suggestions');
            if (!config?.enabled) {
                await interaction.editReply({ content: "Le module de suggestions est désactivé sur ce serveur." });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId('suggestion_modal_server')
                .setTitle('Suggestion pour le Serveur');
            
            const titleInput = new TextInputBuilder()
                .setCustomId('suggestion_title')
                .setLabel("Titre de votre suggestion")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ex: Ajouter un salon pour les mèmes")
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('suggestion_description')
                .setLabel("Décrivez votre suggestion en détail")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Expliquez pourquoi votre suggestion serait bénéfique pour le serveur...")
                .setRequired(true);
                
            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput), new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput));
            
            await interaction.showModal(modal);
            return;
        }

        // --- Handler for Content Creator Buttons ---
        if (customId === 'publish_content') {
            if (!interaction.channel || !interaction.message.embeds[0]) return;
            
            const embed = interaction.message.embeds[0];
            const footerText = embed.footer?.text || '';

            if (footerText.includes('announce_channel')) {
                const channelId = footerText.split(':')[1];
                const targetChannel = await client.channels.fetch(channelId).catch(() => null) as TextChannel;
                if (targetChannel) {
                    await targetChannel.send({ embeds: [embed] });
                    await interaction.update({ content: '<:Oui:1421563353888723084> Annonce publiée avec succès !', components: [], embeds: [] });
                } else {
                    await interaction.update({ content: '<:Non:1421563259537850471> Erreur : Le salon d\'annonce est introuvable.', components: [], embeds: [] });
                }
            } else if (footerText.includes('admin_announce')) {
                await interaction.update({ content: '🚀 Envoi de l\'annonce globale en cours...', components: [], embeds: [] });
                
                addBotLog(`[Annonce Globale] Envoi de l'annonce : "${embed.title}"`);
                const allServers = getAllBotServers();
                let successCount = 0;
                const failures: { name: string; id: string; reason: string }[] = [];

                for (const serverId of allServers.map(s => s.id)) {
                    let guild;
                    try {
                        guild = await client.guilds.fetch(serverId).catch(() => null);
                        if (!guild) {
                            failures.push({ id: serverId, name: 'Serveur Inconnu', reason: 'Le bot n\'est plus sur ce serveur.' });
                            continue;
                        }

                        const config = await getServerConfig(guild.id, 'announcements');
                        let targetChannel: TextChannel | null = null;
                        if (config && config.bot_announcement_channel_id) {
                            targetChannel = await client.channels.fetch(config.bot_announcement_channel_id).catch(() => null) as TextChannel;
                        }
                        if (!targetChannel) {
                             failures.push({ id: guild.id, name: guild.name, reason: 'Aucun salon d\'annonce configuré.' });
                             continue;
                        }
                        await targetChannel.send({ embeds: [embed] });
                        successCount++;
                    } catch (error: any) {
                        failures.push({ id: serverId, name: guild?.name || 'ID Inconnu', reason: `Erreur API: ${error.message}` });
                    }
                }
                const summaryMessage = `<:Oui:1421563353888723084> Annonce envoyée avec succès à **${successCount}** serveurs. Échec pour **${failures.length}** serveurs.`;
                await interaction.followUp({ content: summaryMessage, ephemeral: true });

                if (failures.length > 0) {
                    let report = "Rapport d'échec pour la commande `/adminannounce`:\n\n";
                    for (const fail of failures) {
                        report += `**Serveur :** ${fail.name} (\`${fail.id}\`)\n**Raison :** ${fail.reason}\n-----------------\n`;
                    }
                    try {
                        await interaction.user.send(report.substring(0, 2000));
                    } catch (dmError) {
                        console.error(`[AdminAnnounce] Impossible d'envoyer le rapport d'erreurs en DM.`, dmError);
                    }
                }
            } else { // Fallback for iacontent
                await interaction.channel.send({ embeds: [embed] });
                await interaction.update({ content: '<:Oui:1421563353888723084> Contenu publié avec succès !', components: [], embeds: [] });
            }
            return;
        }

        if (customId === 'cancel_content') {
             await interaction.message.delete();
             return;
        }
        
        if (customId === 'modify_content') {
            const modal = new ModalBuilder()
                .setCustomId('content_modification_modal')
                .setTitle('Modifier le Contenu IA');

            const requestInput = new TextInputBuilder()
                .setCustomId('modification_request')
                .setLabel("Quelles modifications souhaitez-vous ?")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Ex: 'Rends-le plus court', 'Utilise un ton plus professionnel', 'Ajoute un emoji à la fin'...")
                .setRequired(true);
            
            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(requestInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }
        
        // --- Handler for Private Room Button ---
        if (customId === 'create_private_room') {
            if (!interaction.guild) return;
            const config = await getServerConfig(interaction.guild.id, 'private-rooms');
            if (!config || !config.enabled) {
                await interaction.reply({ content: "Le système de salons privés est désactivé.", flags: MessageFlags.Ephemeral });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId('private_room_modal')
                .setTitle(config.modal_title || 'Créer un salon privé');

            const customFields = (config.custom_fields as CustomField[] || []).slice(0, 3);

            if (customFields.length === 0) {
                 await handlePrivateRoomModal(interaction as any);
                 return;
            }

            for (const field of customFields) {
                if (!field.label || field.label.trim() === '') {
                    console.warn(`[PrivateRoom] Skipping custom field with empty label for guild ${interaction.guild.id}`);
                    continue;
                }
                const textInput = new TextInputBuilder()
                    .setCustomId(field.id)
                    .setLabel(field.label)
                    .setPlaceholder(field.placeholder || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
            }

            await interaction.showModal(modal);
            return;
        }
        return;
    }

    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        addBotLog(`[Error] No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
        addBotLog(`[Error] Executing command ${interaction.commandName}: ${error}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    }
});


const token = process.env.DISCORD_TOKEN;
if (!token) {
    throw new Error('DISCORD_TOKEN is not defined in your environment variables. Please create a .env file and add it.');
}
if (!process.env.DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_CLIENT_ID is not defined in your environment variables. Please create a .env file and add it.');
}
if (!process.env.DISCORD_CLIENT_SECRET) {
    throw new Error('DISCORD_CLIENT_SECRET is not defined in your environment variables. Please create a .env file and add it.');
}

async function startBot() {
    try {
        addBotLog('[Auth] Attempting to log in with bot token...');
        await client.login(token);
        addBotLog('[Auth] Bot successfully logged in.');
    } catch (error) {
        addBotLog(`[Error] Bot failed to start: ${error}`);
        process.exit(1);
    }
}

startBot();

(global as any).discordClient = client;
