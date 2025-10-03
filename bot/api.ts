
import express from 'express';
import cors from 'cors';
import { Client, CategoryChannel, ChannelType, REST, Routes } from 'discord.js';
import { updateServerConfig, getServerConfig, getAllBotServers, addKnowledgeBaseItem, getGlobalAiStatus, setPanelAccess, getPanelAccess, clearPanelAccess } from '@/lib/db';
import { verifyAndConsumeAuthToken, getBotAccessToken, generateAuthToken } from './auth';
import { updateGuildCommands } from './handlers/commandHandler';
import { generateKeywords } from '@/ai/flows/keyword-generation-flow';
import { knowledgeCreationFlow } from '@/ai/flows/knowledge-creation-flow';

const API_PORT = process.env.BOT_API_PORT || 10033;

export function startApi(client: Client) {
    const app = express();
    const rest = new REST({ version: '10' });

    const corsOptions = {
      origin: '*',
      optionsSuccessStatus: 200,
      allowedHeaders: ['Content-Type', 'Authorization']
    };
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use(express.json({ limit: '50mb' }));

    app.use((req, res, next) => {
        console.log(`[Bot API] Requête reçue : ${req.method} ${req.path}`);
        next();
    });

    const verifyPanelRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        
        const authResult = verifyAndConsumeAuthToken(token);
        
        if (!authResult) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        }
        
        // Attach guildId to the request for later use
        (req as any).guildId = authResult.guildId;
        (req as any).userId = authResult.userId;
        next();
    };

    /**
     * Middleware pour s'assurer que le token du bot est prêt pour l'API Discord.
     */
    const ensureBotToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const token = await getBotAccessToken();
            rest.setToken(token);
            next();
        } catch (error) {
            console.error('[Bot API] Erreur lors de la récupération du token bot:', error);
            res.status(500).json({ error: "Erreur d'authentification interne du bot." });
        }
    };
    
    /**
     * Middleware to check if AI features are globally disabled.
     */
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

    app.post('/api/verify-token', (req, res) => {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required.' });
        }
        
        const authResult = verifyAndConsumeAuthToken(token);
        
        if (!authResult) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        
        const sessionToken = generateAuthToken(authResult.userId, authResult.guildId);
        
        res.status(200).json({ 
            success: true, 
            guildId: authResult.guildId,
            sessionToken: sessionToken
        });
    });

    app.post('/api/update-config/:guildId/:module', verifyPanelRequest, ensureBotToken, async (req, res) => {
        const { guildId, module } = req.params;
        const configData = req.body;

        if (guildId !== (req as any).guildId) {
            return res.status(403).json({ error: 'Forbidden: Mismatched guild ID.' });
        }

        try {
            console.log(`[Bot API] Mise à jour de la config pour le serveur ${guildId}, module ${module}`);
            await updateServerConfig(guildId, module as any, configData);

            // Trigger command update for the guild
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

    app.get('/api/get-config/:guildId/:module', verifyPanelRequest, async (req, res) => {
        const { guildId, module } = req.params;

        if (guildId !== (req as any).guildId) {
            return res.status(403).json({ error: 'Forbidden: Mismatched guild ID.' });
        }
        
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

    app.get('/api/global-ai-status', verifyPanelRequest, (req, res) => {
        try {
            const status = getGlobalAiStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch global AI status.' });
        }
    });

     app.get('/api/get-server-details/:guildId', verifyPanelRequest, async (req, res) => {
        const { guildId } = req.params;

        if (guildId !== (req as any).guildId) {
            return res.status(403).json({ error: 'Forbidden: Mismatched guild ID.' });
        }
        
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

    app.post('/api/get-servers-details', verifyPanelRequest, async (req, res) => {
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

    app.get('/api/backup/:guildId/export', verifyPanelRequest, async (req, res) => {
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
                                nsfw: 'nsfw' in channel ? channel.nsfw : false,
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

    app.post('/api/generate-keywords', verifyPanelRequest, checkGlobalAiStatus, async (req, res) => {
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

    app.post('/api/add-knowledge-item/:guildId', verifyPanelRequest, checkGlobalAiStatus, async (req, res) => {
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

    app.listen(API_PORT, '0.0.0.0', () => {
        console.log(`[Bot API] Le serveur API interne écoute sur le port ${API_PORT}`);
    });
}
