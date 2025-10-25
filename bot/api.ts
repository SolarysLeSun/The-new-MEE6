

import express from 'express';
import cors from 'cors';
import { Client, CategoryChannel, ChannelType, REST, Routes, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, DiscordAPIError } from 'discord.js';
import { updateServerConfig, getServerConfig, getAllBotServers, getGlobalAiStatus, addKnowledgeBaseItem, redeemPremiumKey, getPanelMessage, getGuildLeaderboard, getRoadmapItems, addRoadmapItem, updateRoadmapItem, deleteRoadmapItem, getApiKeyInfo } from '@/lib/db';
import { generatePersonaPrompt, generatePersonaAvatar } from '@/ai/flows/persona-flow';
import { v4 as uuidv4 } from 'uuid';
import { updateGuildCommands } from './handlers/commandHandler';
import { generateKeywords } from '@/ai/flows/keyword-generation-flow';
import { knowledgeCreationFlow } from '@/ai/flows/knowledge-creation-flow';
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { fixEmbedJson } from '@/ai/flows/embed-json-fixer';

const API_PORT = process.env.BOT_API_PORT || 3630;
const OWNER_ID = '556529963877138442';
const WEBHOOK_NAME = "Marcus";
const MARCUS_EMOJI_GUILD_ID = '1245654161282826260';
const ADMIN_PASSWORD = 'cresus';


// --- Panel User Authentication ---

interface AuthToken {
    userId: string;
    guildId: string;
    expires: number;
}

// Store tokens in memory. For a multi-process setup, a shared store like Redis would be needed.
const activeTokens = new Map<string, AuthToken>();
const TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a single-use authentication token for a user and guild.
 */
export function generateAuthToken(userId: string, guildId: string): string {
    const token = randomBytes(32).toString('hex');
    activeTokens.set(token, {
        userId,
        guildId,
        expires: Date.now() + TOKEN_EXPIRATION_MS,
    });
    console.log(`[Auth] Generated token for user ${userId} on guild ${guildId}`);
    return token;
}

/**
 * Verifies a token and returns the associated guild and user IDs.
 * The token is invalidated after successful verification.
 */
function verifyAndConsumeAuthToken(token: string): { guildId: string; userId: string } | null {
    const tokenData = activeTokens.get(token);

    if (!tokenData) {
        console.warn(`[Auth] Verification failed: Token not found.`);
        return null;
    }

    // Token has been used, so invalidate it immediately
    activeTokens.delete(token);

    if (Date.now() > tokenData.expires) {
        console.warn(`[Auth] Verification failed: Token expired for user ${tokenData.userId}.`);
        return null;
    }
    
    console.log(`[Auth] Successfully verified token for user ${tokenData.userId} on guild ${tokenData.guildId}.`);
    return { guildId: tokenData.guildId, userId: tokenData.userId };
}

// Periodically clean up expired tokens to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [token, tokenData] of activeTokens.entries()) {
        if (now > tokenData.expires) {
            activeTokens.delete(token);
            console.log(`[Auth] Cleaned up expired token for user ${tokenData.userId}.`);
        }
    }
}, 60 * 1000); // Run every minute


export function startApi(client: Client) {
    const app = express();
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

    const corsOptions = {
      origin: '*',
      optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
    app.use(express.json({ limit: '50mb' }));

    app.use((req, res, next) => {
        console.log(`[Bot API] Requête reçue : ${req.method} ${req.path}`);
        next();
    });
    
    const checkGlobalAiStatus = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const status = getGlobalAiStatus();
            if (status.disabled) {
                return res.status(503).json({ 
                    error: 'AI features are temporarily disabled by the administrator.',
                    reason: status.reason 
                });
            }
            next();
        } catch(e) {
            return res.status(500).json({ 
                error: 'Failed to check AI status.',
            });
        }
    };
    
    // --- Admin Auth Middleware ---
    const checkAdminPassword = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const providedPassword = req.body.password || req.headers['x-admin-password'];
        if (providedPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Mot de passe administrateur invalide.' });
        }
        next();
    };

    // --- Public API Auth Middleware ---
    const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing API key.' });
        }
        const key = authHeader.split(' ')[1];
        const keyInfo = getApiKeyInfo(key);

        if (!keyInfo) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API key.' });
        }
        if (keyInfo.isBanned) {
            return res.status(403).json({ error: 'Forbidden: This API key has been suspended.' });
        }

        // Attach user and guild info to the request for later use in endpoints
        (req as any).apiKeyInfo = keyInfo;
        
        next();
    };


    app.get('/api/ping', (req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/api/get-panel-message', (req, res) => {
        try {
            const message = getPanelMessage();
            res.status(200).json(message);
        } catch (error) {
            console.error('[Bot API] Error fetching panel message:', error);
            res.status(500).json({ error: 'Failed to fetch panel message.' });
        }
    });

    app.post('/api/verify-token', (req, res) => {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required.' });
        }
        
        const authResult = verifyAndConsumeAuthToken(token);
        
        if (!authResult) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        
        res.status(200).json({ success: true, guildId: authResult.guildId });
    });

    app.post('/api/update-config/:guildId/:module', async (req, res) => {
        const { guildId, module } = req.params;
        const configData = req.body;

        if (!guildId || !module || !configData) {
            return res.status(400).json({ error: 'Guild ID, module et données de configuration sont requis.' });
        }

        try {
            console.log(`[Bot API] Mise à jour de la config pour le serveur ${guildId}, module ${module}`);
            await updateServerConfig(guildId, module as any, configData);

            // Handle specific post-update actions
            if (module === 'server-identity') {
                const guild = await client.guilds.fetch(guildId).catch(() => null);
                if (guild?.members.me) {
                    const nickname = configData.enabled ? configData.nickname : null;
                    await guild.members.me.setNickname(nickname);
                }
            } else {
                 // For most other config changes, just update commands.
                updateGuildCommands(guildId, client).catch(error => {
                    console.error(`[API] Erreur asynchrone lors de la mise à jour des commandes pour ${guildId}:`, error);
                });
            }
            
            res.status(200).json({ success: true, message: `Configuration pour le module ${module} mise à jour.` });
        } catch (error) {
            console.error(`[Bot API] Erreur lors de la mise à jour de la config pour ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.get('/api/get-config/:guildId/:module', async (req, res) => {
        const { guildId, module } = req.params;
        try {
            const config = await getServerConfig(guildId, module as any);
            if (!config) {
                return res.status(404).json({ message: 'Configuration non trouvée. Utilisation des valeurs par défaut.' });
            }
            res.json(config);
        } catch (error) {
            console.error(`[Bot API] Erreur lors de la récupération de la config pour ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.get('/api/global-ai-status', (req, res) => {
        try {
            const status = getGlobalAiStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch global AI status.' });
        }
    });
    
    app.get('/api/get-marcus-emojis', async (req, res) => {
        try {
            const guild = await client.guilds.fetch(MARCUS_EMOJI_GUILD_ID).catch(() => null);
            if (!guild) {
                return res.status(404).json({ error: 'Serveur des emojis Marcus introuvable.' });
            }
            const emojis = Array.from(guild.emojis.cache.values()).map(e => ({ 
                id: e.id, 
                name: e.name, 
                animated: e.animated, 
                url: e.imageURL({ size: 64 }) 
            }));
            res.json({ emojis });
        } catch (error) {
             console.error(`[Bot API] Erreur lors de la récupération des emojis Marcus:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

     app.get('/api/get-server-details/:guildId', async (req, res) => {
        const { guildId } = req.params;
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé.' });
            }

            const premiumConfig = getServerConfig(guildId, 'premium'); // Check a placeholder module to get status

            let isPremium = false;
            if (premiumConfig) {
                isPremium = premiumConfig.premium;
                if (premiumConfig.premium_expires_at) {
                    const expiryDate = new Date(premiumConfig.premium_expires_at);
                    if (expiryDate < new Date()) {
                        isPremium = false;
                    }
                }
            }
            
            const serverDetails = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                isPremium: isPremium,
                channels: Array.from(guild.channels.cache.values()).map(c => ({ id: c.id, name: c.name, type: c.type })),
                roles: Array.from(guild.roles.cache.values()).map(r => ({ id: r.id, name: r.name, color: r.color })),
                emojis: Array.from(guild.emojis.cache.values()).map(e => ({ id: e.id, name: e.name, animated: e.animated, url: e.imageURL({ size: 64 }) })),
            };
            
            res.json(serverDetails);
        } catch (error) {
            console.error(`[Bot API] Erreur lors de la récupération des détails pour ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.post('/api/get-servers-details', async (req, res) => {
        const { guildIds } = req.body;
        if (!Array.isArray(guildIds)) {
            return res.status(400).json({ error: 'guildIds must be an array.' });
        }

        try {
            const promises = guildIds.map(id => client.guilds.fetch(id).catch(() => null));
            const guilds = await Promise.all(promises);

            const serversDetails = guilds
                .filter(g => g !== null)
                .map(guild => ({
                    id: guild!.id,
                    name: guild!.name,
                    iconURL: guild!.iconURL(),
                }));
            
            res.json(serversDetails);
        } catch (error) {
            console.error(`[Bot API] Error fetching details for multiple servers:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.get('/api/backup/:guildId/export', async (req, res) => {
        const { guildId } = req.params;
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            return res.status(404).json({ error: 'Serveur non trouvé.' });
        }
    
        try {
            const backup = {
                name: guild.name,
                id: guild.id,
                exportedAt: new Date().toISOString(),
                roles: guild.roles.cache
                    .filter(role => !role.managed)
                    .map(role => ({
                        name: role.name,
                        color: role.hexColor,
                        hoist: role.hoist,
                        permissions: role.permissions.bitfield.toString(),
                        mentionable: role.mentionable,
                    })),
                channels: guild.channels.cache
                    .filter(c => c.type !== ChannelType.GuildVoice)
                    .map(channel => {
                        const permissionOverwrites = channel.permissionOverwrites?.cache?.map(ow => ({
                            id: ow.id,
                            type: ow.type,
                            allow: ow.allow.bitfield.toString(),
                            deny: ow.deny.bitfield.toString(),
                        })) || [];
    
                        const baseChannelData = {
                            type: channel.type,
                            name: channel.name,
                            permissionOverwrites: permissionOverwrites,
                        };
    
                        if (channel instanceof CategoryChannel) {
                            return {
                                ...baseChannelData,
                                children: channel.children?.cache?.map(child => ({
                                    type: child.type,
                                    name: child.name,
                                    topic: 'topic' in child ? child.topic : null,
                                    nsfw: 'nsfw' in child ? child.nsfw : false,
                                    permissionOverwrites: child.permissionOverwrites?.cache?.map(ow => ({
                                        id: ow.id,
                                        type: ow.type,
                                        allow: ow.allow.bitfield.toString(),
                                        deny: ow.deny.bitfield.toString(),
                                    })) || [],
                                })) || [],
                            };
                        }
                        if (!channel.parentId) {
                             return { 
                                ...baseChannelData,
                                topic: 'topic' in channel ? channel.topic : null,
                                nsfw: 'nsfw' in channel ? (channel as any).nsfw : false,
                            };
                        }
                        return null;
                    }).filter(c => c !== null)
            };
    
            res.json(backup);
    
        } catch (error) {
            console.error(`[Backup API] Erreur lors de l'exportation pour ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur lors de l\'exportation.' });
        }
    });

    app.post('/api/redeem-key', async (req, res) => {
        const { guildId, key } = req.body;
        if (!guildId || !key) {
            return res.status(400).json({ error: 'Guild ID and key are required.' });
        }

        try {
            const result = redeemPremiumKey(key, guildId, req.body.userId);
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
        }
    });

    // --- AI Personas API ---

    app.get('/api/personas/:guildId', (req, res) => {
        try {
            const personas = getPersonasForGuild(guildId);
            res.json(personas);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch personas.' });
        }
    });

    app.post('/api/personas/generate-prompt', checkGlobalAiStatus, async (req, res) => {
        const { name, instructions } = req.body;
        if (!name || !instructions) {
            return res.status(400).json({ error: 'Name and instructions are required.' });
        }
        try {
            const personaPrompt = await generatePersonaPrompt({ name, instructions });
            res.json({ personaPrompt });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate persona prompt.' });
        }
    });

    app.post('/api/personas/create', checkGlobalAiStatus, async (req, res) => {
        const { guild_id, name, persona_prompt, creator_id } = req.body;
         if (!guild_id || !name || !persona_prompt || !creator_id) {
            return res.status(400).json({ error: 'Missing required fields for persona creation.' });
        }
        try {
            const guild = await client.guilds.fetch(guild_id);
            if (!guild) {
                return res.status(404).json({ error: 'Guild not found.' });
            }

            // Create Role
            const newRole = await guild.roles.create({
                name: name,
                mentionable: true,
                reason: `Role for AI Persona: ${name}`
            });

            let avatarDataUri = null;
            try {
                const avatarResult = await generatePersonaAvatar({ name, persona_prompt });
                avatarDataUri = avatarResult.avatarDataUri;
            } catch (avatarError) {
                console.error(`[API] Failed to generate avatar for ${name}, using default.`, avatarError);
            }
            
            const newPersona = {
                id: uuidv4(),
                guild_id,
                name,
                persona_prompt,
                creator_id,
                active_channel_id: null,
                avatar_url: avatarDataUri, 
                role_id: newRole.id,
                bot_token: null
            };

            createPersona(newPersona);
            res.status(201).json(newPersona);
        } catch (error) {
            console.error("[API] Failed to create persona:", error);
            res.status(500).json({ error: 'Failed to create persona.' });
        }
    });

    app.patch('/api/personas/:personaId', (req, res) => {
        const { personaId } = req.params;
        const updates = req.body;
        try {
            updatePersona(personaId, updates);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update persona.' });
        }
    });

    app.delete('/api/personas/:personaId', async (req, res) => {
        const { personaId } = req.params;
        try {
            deletePersona(personaId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete persona.' });
        }
    });

    // --- Keyword Generation API for Auto-Mod ---
    app.post('/api/generate-keywords', checkGlobalAiStatus, async (req, res) => {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        try {
            const result = await generateKeywords({ prompt });
            res.json(result);
        } catch (error) {
            console.error("[Keyword Gen API] Error:", error);
            res.status(500).json({ error: "Failed to generate keywords." });
        }
    });

    app.post('/api/add-knowledge-item/:guildId', checkGlobalAiStatus, async (req, res) => {
        const { guildId } = req.params;
        const { userQuestion, agentResponse } = req.body;

        if (!userQuestion || !agentResponse) {
            return res.status(400).json({ error: 'Question and response are required.' });
        }

        try {
            const newKnowledgeItem = await knowledgeCreationFlow({ userQuestion, agentResponse });
            addKnowledgeBaseItem(guildId, newKnowledgeItem);
            res.status(200).json({ success: true, item: newKnowledgeItem });
        } catch (error) {
            console.error('[API] Error creating knowledge item:', error);
            res.status(500).json({ error: 'Failed to create knowledge item.' });
        }
    });

    app.post('/api/fix-embed-json', checkGlobalAiStatus, async (req, res) => {
        const { json, request } = req.body;
        try {
            const result = await fixEmbedJson({ json, request });
            res.json(result);
        } catch (error) {
            console.error('[API] Error fixing embed JSON:', error);
            res.status(500).json({ error: 'Failed to fix embed JSON.' });
        }
    });

    app.post('/api/send-webhook-embed', async (req, res) => {
        const { channelId, embedData, components, webhookName, webhookAvatarUrl } = req.body;
        if (!channelId) {
            return res.status(400).json({ error: 'channelId is required.' });
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                return res.status(404).json({ error: 'Channel not found or is not a text channel.' });
            }

            const guild = (channel as any).guild;
            const identityConfig = await getServerConfig(guild.id, 'server-identity');

            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.name === (webhookName || WEBHOOK_NAME) && wh.token !== null);

            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: webhookName || WEBHOOK_NAME,
                    avatar: webhookAvatarUrl || identityConfig?.avatar_url || client.user?.displayAvatarURL(),
                    reason: 'Webhook pour le constructeur d\'embeds'
                });
            }

            // Build components if they exist
            let actionRows = [];
            if (components && components.length > 0) {
                const row = new ActionRowBuilder<ButtonBuilder>();
                components.forEach((button: any) => {
                    const btn = new ButtonBuilder()
                        .setLabel(button.label);

                    if (button.style === 'Link') {
                        btn.setStyle(ButtonStyle.Link).setURL(button.action_value);
                    } else {
                        // For non-link buttons, a custom_id is needed.
                        btn.setCustomId(button.id)
                           .setStyle(ButtonStyle[button.style as keyof typeof ButtonStyle]);
                    }

                    if(button.emoji) {
                        btn.setEmoji(button.emoji);
                    }
                    row.addComponents(btn);
                });
                actionRows.push(row);
            }

            await webhook.send({
                content: embedData.content,
                username: webhookName || (identityConfig?.enabled ? identityConfig.nickname : client.user?.username),
                avatarURL: webhookAvatarUrl || (identityConfig?.enabled ? identityConfig.avatar_url : client.user?.displayAvatarURL()),
                embeds: embedData.embeds,
                components: actionRows,
            });

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('[API] Error sending webhook embed:', error);
            if (error instanceof DiscordAPIError) {
                return res.status(400).json({ error: `Erreur de l'API Discord : ${error.message}` });
            }
            res.status(500).json({ error: `Erreur interne : ${error.message || 'Impossible d\'envoyer l\'embed'}` });
        }
    });
    
    app.get('/api/check-premium/:guildId', async (req, res) => {
        const { guildId } = req.params;
        const providedSecret = req.headers['x-bot-secret'];

        if (!process.env.EXTERNAL_BOT_SECRET) {
            console.error('[API Check Premium] La variable d\'environnement EXTERNAL_BOT_SECRET n\'est pas définie.');
            return res.status(500).json({ error: 'Internal server configuration error.' });
        }

        if (providedSecret !== process.env.EXTERNAL_BOT_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID is required.' });
        }

        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                return res.status(404).json({ error: 'Guild not found.' });
            }

            const serverBuilderConfig = getServerConfig(guildId, 'server-builder');
            const isPremiumAndEnabled = (serverBuilderConfig?.premium && serverBuilderConfig?.enabled) || false;

            res.status(200).json({ isPremium: isPremiumAndEnabled });
        } catch (error) {
            console.error(`[API Check Premium] Erreur lors de la vérification du statut premium pour ${guildId}:`, error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    });
    
    // --- Roadmap API ---
    app.get('/api/roadmap/items', (req, res) => {
        try {
            const items = getRoadmapItems();
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch roadmap items.' });
        }
    });

    app.post('/api/roadmap/add', checkAdminPassword, (req, res) => {
        try {
            addRoadmapItem(req.body);
            res.status(201).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add roadmap item.' });
        }
    });

    app.put('/api/roadmap/update', checkAdminPassword, (req, res) => {
        try {
            updateRoadmapItem(req.body);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update roadmap item.' });
        }
    });

    app.delete('/api/roadmap/delete/:id', checkAdminPassword, (req, res) => {
        try {
            deleteRoadmapItem(req.params.id);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete roadmap item.' });
        }
    });

    app.post('/api/restart-bot', checkAdminPassword, (req, res) => {
        console.log('[API] Commande de redémarrage reçue. Exécution de "pm2 restart bot"...');

        exec('pm2 restart bot', (error, stdout, stderr) => {
            if (error) {
                console.error(`[API] Erreur lors de l'exécution de la commande de redémarrage : ${error.message}`);
                return res.status(500).json({ error: "Échec de l'exécution de la commande de redémarrage.", details: stderr });
            }
            console.log(`[API] PM2 stdout: ${stdout}`);
            console.error(`[API] PM2 stderr: ${stderr}`);
            res.status(200).json({ success: true, message: 'Commande de redémarrage envoyée à PM2.' });
        });
    });

    app.post('/api/report-issue', async (req, res) => {
        const { description, contact } = req.body;
        if (!description) {
            return res.status(400).json({ error: 'La description est requise.' });
        }

        try {
            const owner = await client.users.fetch(OWNER_ID);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚨 Nouveau Rapport de Problème')
                .addFields(
                    { name: 'Description du Problème', value: description },
                )
                .setTimestamp();
            
            if (contact) {
                embed.addFields({ name: 'Contact Utilisateur', value: contact, inline: true });
            }

            await owner.send({ embeds: [embed] });

            res.status(200).json({ success: true, message: 'Rapport envoyé.' });
        } catch (error) {
            console.error('[API] Erreur lors de l\'envoi du rapport de problème :', error);
            res.status(500).json({ error: 'Impossible d\'envoyer le rapport au propriétaire du bot.' });
        }
    });

    // --- Public API Endpoints ---

    const publicApiRouter = express.Router();
    publicApiRouter.use(checkApiKey);

    publicApiRouter.get('/leaderboard/:guildId', async (req, res) => {
        const { guildId } = req.params;
        const { limit = '10' } = req.query;

        // Check if the API key's guildId matches the requested guildId
        if ((req as any).apiKeyInfo.guildId !== guildId) {
            return res.status(403).json({ error: 'Forbidden: This API key is not authorized for the requested server.' });
        }

        try {
            const leaderboardData = getGuildLeaderboard(guildId, parseInt(limit as string, 10));
            const enrichedLeaderboard = await Promise.all(
                leaderboardData.map(async (entry, index) => {
                    try {
                        const user = await client.users.fetch(entry.user_id);
                        return {
                            rank: index + 1,
                            user: {
                                id: user.id,
                                username: user.username,
                                tag: user.tag,
                                avatar: user.displayAvatarURL({ size: 128 }),
                            },
                            level: entry.level,
                            xp: entry.xp,
                            requiredXp: entry.requiredXp,
                        };
                    } catch (error) {
                        return {
                            rank: index + 1,
                            user: {
                                id: entry.user_id,
                                username: 'Utilisateur Inconnu',
                                tag: '????',
                                avatar: null,
                            },
                            level: entry.level,
                            xp: entry.xp,
                            requiredXp: entry.requiredXp,
                        };
                    }
                })
            );
            res.json(enrichedLeaderboard);
        } catch (error) {
            console.error(`[Public API] Error fetching leaderboard for ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.use('/api/public', publicApiRouter);

    // --- OLD Public Leaderboard API (deprecated, will be removed) ---
    app.get('/api/leaderboard/:guildId', async (req, res) => {
        const { guildId } = req.params;
        const { limit = '10' } = req.query;

        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID is required.' });
        }

        try {
            const leaderboardData = getGuildLeaderboard(guildId, parseInt(limit as string, 10));

            const enrichedLeaderboard = await Promise.all(
                leaderboardData.map(async (entry, index) => {
                    try {
                        const user = await client.users.fetch(entry.user_id);
                        return {
                            rank: index + 1,
                            user: {
                                id: user.id,
                                username: user.username,
                                tag: user.tag,
                                avatar: user.displayAvatarURL({ size: 128 }),
                            },
                            level: entry.level,
                            xp: entry.xp,
                            requiredXp: entry.requiredXp,
                        };
                    } catch (error) {
                        return {
                            rank: index + 1,
                            user: {
                                id: entry.user_id,
                                username: 'Utilisateur Inconnu',
                                tag: '????',
                                avatar: null,
                            },
                            level: entry.level,
                            xp: entry.xp,
                            requiredXp: entry.requiredXp,
                        };
                    }
                })
            );
            
            res.json(enrichedLeaderboard);

        } catch (error) {
            console.error(`[Leaderboard API] Error fetching leaderboard for ${guildId}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
    });

    app.get('/api/system-status', (req, res) => {
        exec('pm2 jlist', (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`[API /system-status] Error executing pm2 jlist:`, error || stderr);
                return res.status(500).json({ error: "Impossible de récupérer le statut des processus." });
            }

            try {
                const processes = JSON.parse(stdout);
                const botProcesses = processes
                    .filter((p: any) => p.name === 'bot')
                    .map((proc: any) => ({
                        id: proc.pm_id,
                        status: proc.pm2_env.status,
                        cpu: proc.monit.cpu || 0,
                        memory: (proc.monit.memory / 1024 / 1024).toFixed(1), // In MB
                    }));

                res.status(200).json(botProcesses);

            } catch (parseError) {
                console.error('[API /system-status] Erreur lors du parsing du JSON de pm2:', parseError);
                res.status(500).json({ error: "Impossible de lire la sortie de la commande de statut." });
            }
        });
    });

    app.listen(API_PORT, '0.0.0.0', () => {
        console.log(`[Bot API] Le serveur API interne écoute sur le port ${API_PORT}`);
    });
}

    
