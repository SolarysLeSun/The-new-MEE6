
import express from 'express';
import cors from 'cors';
import { Client, CategoryChannel, ChannelType, REST, Routes } from 'discord.js';
import { updateServerConfig, getServerConfig, getAllBotServers, getPersonasForGuild, updatePersona, deletePersona, createPersona, getGlobalAiStatus, addKnowledgeBaseItem, redeemPremiumKey, getPanelMessage } from '@/lib/db';
import { generatePersonaPrompt, generatePersonaAvatar } from '@/ai/flows/persona-flow';
import { v4 as uuidv4 } from 'uuid';
import { updateGuildCommands } from './handlers/commandHandler';
import { generateKeywords } from '@/ai/flows/keyword-generation-flow';
import { knowledgeCreationFlow } from '@/ai/flows/knowledge-creation-flow';
import { randomBytes } from 'crypto';

const API_PORT = process.env.BOT_API_PORT || 3001; // toujour le port 3630 !!

// --- In-Memory Logger ---
const botLogs: string[] = [];
const MAX_LOGS = 50;

export function addBotLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const logMessage = `[${timestamp}] ${message}`;
    botLogs.unshift(logMessage); // Add to the beginning
    if (botLogs.length > MAX_LOGS) {
        botLogs.pop(); // Remove the oldest
    }
}


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
    addBotLog(`[Auth] Generated token for user ${userId} on guild ${guildId}`);
    return token;
}

/**
 * Verifies a token and returns the associated guild and user IDs.
 * The token is invalidated after successful verification.
 */
function verifyAndConsumeAuthToken(token: string): { guildId: string; userId: string } | null {
    const tokenData = activeTokens.get(token);

    if (!tokenData) {
        addBotLog(`[Auth] Verification failed: Token not found.`);
        return null;
    }

    // Token has been used, so invalidate it immediately
    activeTokens.delete(token);

    if (Date.now() > tokenData.expires) {
        addBotLog(`[Auth] Verification failed: Token expired for user ${tokenData.userId}.`);
        return null;
    }
    
    addBotLog(`[Auth] Successfully verified token for user ${tokenData.userId} on guild ${tokenData.guildId}.`);
    return { guildId: tokenData.guildId, userId: tokenData.userId };
}

// Periodically clean up expired tokens to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [token, tokenData] of activeTokens.entries()) {
        if (now > tokenData.expires) {
            activeTokens.delete(token);
            addBotLog(`[Auth] Cleaned up expired token for user ${tokenData.userId}.`);
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
        // Do not log frequent requests from the status page
        if (req.path !== '/api/ping' && req.path !== '/api/get-bot-logs') {
            addBotLog(`[API] Received: ${req.method} ${req.path}`);
        }
        next();
    });
    
    const checkGlobalAiStatus = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const status = getGlobalAiStatus();
        if (status.disabled) {
            return res.status(503).json({ 
                error: 'AI features are temporarily disabled by the administrator.',
                reason: status.reason 
            });
        }
        next();
    };

    app.get('/api/ping', (req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/api/get-bot-logs', (req, res) => {
        res.status(200).json({ logs: botLogs });
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
            addBotLog(`[Config] Updating config for guild ${guildId}, module ${module}`);
            await updateServerConfig(guildId, module as any, configData);

            updateGuildCommands(guildId, client).catch(error => {
                console.error(`[API] Erreur asynchrone lors de la mise à jour des commandes pour ${guildId}:`, error);
            });

            if (module === 'server-identity' && configData.enabled) {
                const guild = await client.guilds.fetch(guildId);
                if (guild.members.me) {
                    await guild.members.me.setNickname(configData.nickname || null);
                }
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

     app.get('/api/get-server-details/:guildId', async (req, res) => {
        const { guildId } = req.params;
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé.' });
            }

            const premiumConfig = await getServerConfig(guildId, 'moderation'); 

            const serverDetails = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                isPremium: premiumConfig?.premium || false,
                channels: Array.from(guild.channels.cache.values()).map(c => ({ id: c.id, name: c.name, type: c.type })),
                roles: Array.from(guild.roles.cache.values()).map(r => ({ id: r.id, name: r.name, color: r.color })),
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
                        const baseChannelData = {
                            type: channel.type,
                            name: channel.name,
                            permissionOverwrites: channel.permissionOverwrites.cache.map(ow => ({
                                id: ow.id,
                                type: ow.type,
                                allow: ow.allow.bitfield.toString(),
                                deny: ow.deny.bitfield.toString(),
                            })),
                        };
                        if (channel instanceof CategoryChannel) {
                            return {
                                ...baseChannelData,
                                children: channel.children.cache.map(child => ({
                                    type: child.type,
                                    name: child.name,
                                    topic: 'topic' in child ? child.topic : null,
                                    nsfw: 'nsfw' in child ? child.nsfw : false,
                                    permissionOverwrites: child.permissionOverwrites.cache.map(ow => ({
                                        id: ow.id,
                                        type: ow.type,
                                        allow: ow.allow.bitfield.toString(),
                                        deny: ow.deny.bitfield.toString(),
                                    }))
                                }))
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
            const result = redeemPremiumKey(key, guildId);
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
        }
    });

    app.post('/api/report-problem', async (req, res) => {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Le message du rapport est requis.' });
        }

        const ownerId = process.env.OWNER_ID;
        if (!ownerId) {
            console.error('[API] OWNER_ID non défini dans l\'environnement.');
            return res.status(500).json({ error: 'Configuration interne du serveur incorrecte.' });
        }

        try {
            const owner = await client.users.fetch(ownerId);
            await owner.send(`🚨 **Nouveau rapport de problème depuis la page de statut :**\n\n>>> ${message}`);
            res.status(200).json({ success: true, message: 'Rapport envoyé.' });
        } catch (error) {
            console.error('[API] Impossible d\'envoyer le rapport de problème au propriétaire:', error);
            res.status(500).json({ error: "Impossible d'envoyer le rapport au propriétaire du bot." });
        }
    });

    // --- AI Personas API ---

    app.get('/api/personas/:guildId', (req, res) => {
        const { guildId } = req.params;
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


    app.listen(API_PORT, () => {
        addBotLog(`[API] Internal API server listening on port ${API_PORT}`);
    });
}

  
