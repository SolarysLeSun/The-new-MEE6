

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Client, Guild, User, PermissionOverwriteManager, PermissionOverwrites, Collection, OverwriteResolvable, EmbedBuilder } from 'discord.js';
import type { Module, ModuleConfig, DefaultConfigs, Persona, PersonaMemory, SanctionHistoryEntry, KnowledgeBaseItem, SanctionPreset, AutoSanction, RoleReward, XPBoost, UserLevel, PanelMessage } from '../types';
import { randomBytes } from 'crypto';
import ms from 'ms';

// Assurez-vous que le répertoire de la base de données existe
const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'bot.db');
const db = new Database(dbPath);
console.log(`[Database] Connecté à la base de données SQLite sur ${dbPath}`);


// --- Schéma et Migration de la Base de Données ---
const upgradeSchema = () => {
    try {
        db.pragma('journal_mode = WAL');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS global_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                reason TEXT
            );
        `);
        db.exec(`INSERT OR IGNORE INTO global_settings (key, value) VALUES ('ai_disabled', '0');`);
        db.exec(`INSERT OR IGNORE INTO global_settings (key, value) VALUES ('panel_message', NULL);`);
        console.log('[Database] La table "global_settings" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS locked_channels (
                channel_id TEXT PRIMARY KEY,
                original_permissions TEXT NOT NULL
            );
        `);
        console.log('[Database] La table "locked_channels" est prête.');


        db.exec(`
            CREATE TABLE IF NOT EXISTS sanction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                reason TEXT,
                duration_seconds INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] La table "sanction_history" est prête.');
        
        const configColumns = db.pragma('table_info(server_configs)') as any[];
        if (!configColumns.some(col => col.name === 'premium')) {
            console.log('[Database] Mise à jour du schéma : Ajout de la colonne "premium" à server_configs.');
            db.exec('ALTER TABLE server_configs ADD COLUMN premium BOOLEAN DEFAULT FALSE');
        }
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS testers (
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                expires_at DATETIME,
                PRIMARY KEY (user_id, guild_id)
            );
        `);
        console.log('[Database] La table "testers" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS premium_keys (
                key TEXT PRIMARY KEY,
                generated_by TEXT NOT NULL,
                generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_used BOOLEAN DEFAULT FALSE,
                used_by_guild TEXT,
                used_at DATETIME,
                expires_at DATETIME
            );
        `);
         // Check if expires_at column exists
        const keyColumns = db.pragma('table_info(premium_keys)') as any[];
        if (!keyColumns.some(col => col.name === 'expires_at')) {
            console.log('[Database] Mise à jour du schéma : Ajout de la colonne "expires_at" à premium_keys.');
            db.exec('ALTER TABLE premium_keys ADD COLUMN expires_at DATETIME');
        }
        console.log('[Database] La table "premium_keys" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS user_levels (
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 0,
                last_message_timestamp DATETIME,
                PRIMARY KEY (user_id, guild_id)
            );
        `);
        console.log('[Database] La table "user_levels" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS delegated_permissions (
                user_id TEXT NOT NULL,
                permission_key TEXT NOT NULL,
                granted_by TEXT NOT NULL,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, permission_key)
            );
        `);
        console.log('[Database] La table "delegated_permissions" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS referrals (
                referring_guild_id TEXT NOT NULL,
                referred_guild_id TEXT PRIMARY KEY NOT NULL,
                referred_owner_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
         db.exec('CREATE INDEX IF NOT EXISTS idx_referring_guild_id ON referrals (referring_guild_id);');
        console.log('[Database] La table "referrals" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS dev_guilds (
                guild_id TEXT PRIMARY KEY NOT NULL
            );
        `);
        console.log('[Database] La table "dev_guilds" est prête.');


    } catch (error) {
        console.error('[Database] Erreur lors de la mise à jour du schéma:', error);
    }
};


const createConfigTable = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS server_configs (
            guild_id TEXT NOT NULL,
            module TEXT NOT NULL,
            config TEXT NOT NULL,
            premium BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (guild_id, module)
        );
    `);
    console.log('[Database] La table "server_configs" est prête.');
    upgradeSchema();
};

// --- Configurations par défaut pour les nouveaux serveurs ---
const defaultConfigs: DefaultConfigs = {
    'moderation': { 
        enabled: true, 
        log_channel_id: null, 
        dm_user_on_action: true, 
        presets: [],
        auto_sanctions: [],
        command_permissions: {
            ban: null,
            unban: null,
            kick: null,
            mute: null,
            warn: null,
            listwarns: null,
            kickvoc: null,
        }
    },
    'general-commands': {
        enabled: true,
        command_permissions: {
            invite: null,
            ping: null,
            help: null,
            marcus: null,
            traduire: null,
        },
        command_enabled: {
            invite: true,
            ping: true,
            help: true,
            marcus: true,
            traduire: true,
            say: true,
            level: true,
        }
    },
    'community-assistant': {
        enabled: false,
        premium: true,
        confidence_threshold: 75,
        knowledge_base: [],
        faq_scan_enabled: false,
        command_permissions: {
            faq: null
        },
        scheduled_suggestions_enabled: false,
        suggestion_frequency: 'daily',
        suggestion_channel_id: null,
        suggestion_tags: 'film de science-fiction, jeu de stratégie',
        suggestion_prompt: 'Sois enthousiaste et donne envie de découvrir ta suggestion !',
    },
    'auto-moderation': {
        enabled: false,
        rules: [],
        log_channel_id: null,
    },
    'logs': {
        enabled: true,
        main_channel_id: null,
        exempt_roles: [],
        exempt_channels: [],
        log_settings: {
            messages: { enabled: true, channel_id: null },
            members: { enabled: true, channel_id: null },
            channels: { enabled: false, channel_id: null },
            roles: { enabled: false, channel_id: null },
            moderation: { enabled: true, channel_id: null },
            voice: { enabled: false, channel_id: null },
            server: { enabled: false, channel_id: null },
        }
    },
    'auto-translation': {
        enabled: false,
        premium: false,
        mode: 'inline',
        channels: [],
    },
     'lock': {
        enabled: true,
        exempt_roles: [],
        command_permissions: {
            lock: null,
            unlock: null,
        }
    },
    'backup': {
        enabled: true,
        command_permissions: {
            backup: null
        }
    },
    'anti-bot': { 
        enabled: false, 
        mode: 'approval-required', 
        approval_channel_id: null, 
        whitelisted_bots: [] 
    },
    'webcam': {
        enabled: true,
        webcam_allowed: true,
        stream_allowed: true,
        exempt_roles: [],
    },
    'captcha': { 
        enabled: false, 
        verification_channel: null, 
        verified_role_id: null,
        premium: true
    },
    'image-filter': { 
        enabled: false, 
        sensitivity: 'medium',
        premium: true,
        exempt_roles: [],
        exempt_channels: []
    },
    'moderation-ai': { 
        enabled: false,
        premium: true,
        alert_channel_id: null,
        alert_role_id: null,
        sensitivity: 'medium',
        exempt_roles: [],
        exempt_channels: [],
        actions: {
            low: 'warn',
            medium: 'mute_5m',
            high: 'mute_1h',
            critical: 'ban'
        }
    },
    'anti-raid': { 
        enabled: true, 
        premium: false,
        sensitivity: 'medium', 
        action: 'lockdown',
        alert_channel_id: null,
    },
    'link-scanner': {
        enabled: false,
        premium: true,
        action: 'delete',
        alert_channel_id: null,
        exempt_roles: [],
        allow_nsfw_links: false
    },
    'private-rooms': { 
        enabled: true, 
        creation_channel: null, 
        category_id: null, 
        embed_message: 'Cliquez sur le bouton ci-dessous pour créer un salon privé.',
        channel_name_format: 'ticket-{user}',
        archive_summary: true,
        modal_title: 'Créer un salon privé',
        custom_fields: [],
        command_permissions: {
            addprivate: null,
            privateresum: null,
        }
    },
    'smart-events': { 
        enabled: true, 
        suggest_time: true, 
        templates: 'quiz', 
        rsvp_tracking: true, 
        recurring_events: false,
        command_permissions: {
            'event-create': null,
            'event-list': null
        }
    },
    'smart-voice': { 
        enabled: false, 
        premium: true,
        interactive_category_id: null,
        default_channel_name: "Vocal intéractif",
        custom_instructions: ''
    },
    'content-ai': { 
        enabled: false, 
        premium: true,
        default_tone: 'familiar', 
        custom_instructions: '',
        allow_nsfw_images: false,
        command_permissions: {
            iacontent: null,
            histoire: null,
        }
    },
    'server-builder': { 
        enabled: false, 
        premium: true,
        command_permissions: {
            iacreateserv: null,
            iaeditserv: null,
            iadeleteserv: null,
            iaresetserv: null,
        }
    },
    'welcome-message': {
        enabled: false,
        welcome_channel_id: null,
        welcome_message: 'Bienvenue sur le serveur, {user} ! 🎉',
    },
    'tester-commands': {
        enabled: true,
        command_permissions: {
            mp: null,
            webhook: null,
            tester: null,
            givepremium: null,
            genpremium: null,
            giverole: null,
            disableia: null,
            enableia: null,
        },
    },
    'conversational-agent': {
        enabled: false,
        premium: true,
        agent_name: 'Marcus',
        agent_role: '',
        agent_personality: '',
        custom_prompt: '',
        knowledge_base: [],
        dedicated_channel_id: null,
        allow_imagination: false,
        allow_freewheeling: false,
    },
    'suggestions': {
        enabled: true,
        suggestion_channel_id: null,
        upvote_emoji: '👍',
        downvote_emoji: '👎',
        command_permissions: {
            suggest: null,
            setsuggest: null,
        }
    },
    'ai-personas': {
        enabled: false,
        premium: true,
        command_permissions: {
            personnage: null,
        },
    },
    'ai-assistant': {
        enabled: true,
        command_permissions: {
            ia: null
        },
    },
    'server-identity': {
        enabled: true,
        nickname: null,
        avatar_url: null,
    },
    'autoroles': {
        enabled: true,
        on_join_roles: [],
        on_voice_join_roles: [],
        ai_onboarding_enabled: false,
        ai_onboarding_questions: [],
        ai_onboarding_roles: [],
    },
    'security-alerts': {
        enabled: true,
        alert_channel_id: null,
        account_age_check_enabled: true,
        account_age_threshold_days: 7,
        similar_username_check_enabled: true,
        similar_username_sensitivity: 80,
    },
    'moveall': {
        enabled: true,
        premium: true,
    },
    'manual-voice-control': {
        enabled: true,
        command_permissions: {
            join: null,
            leave: null,
            parle: null
        }
    },
    'announcements': {
        enabled: true,
        announcement_channel_id: null,
        bot_announcement_channel_id: null,
        command_permissions: {
            announce: null,
            adminannounce: null,
        }
    },
    'leveling': {
        enabled: true,
        xp_per_message: 15,
        xp_per_reaction: 5,
        xp_per_minute_in_voice: 10,
        xp_boost_webcam_multiplier: 1.5,
        cooldown_seconds: 60,
        level_up_message: 'Félicitations {user}, vous avez atteint le niveau {level} !',
        level_up_channel_id: null,
        mention_user_on_levelup: true,
        level_up_frequency: 1,
        level_card_background_url: null,
        level_card_bar_color: '#FFFFFF',
        level_card_text_color: '#FFFFFF',
        ignored_channels: [],
        role_rewards: [],
        xp_boost_roles: [],
        xp_boost_channels: [],
        command_permissions: {
            level: null,
            topxp: null,
            webleaderboard: null,
        },
    },
    'fun-commands': {
        enabled: true,
        command_permissions: {
            renameall: null,
            mutemass: null,
            reactbomb: null,
            react: null,
            randomnickname: null,
        }
    },
    'admin': {
        enabled: true,
        command_permissions: {
            restart: null,
        },
    },
    'utils': {
        enabled: true,
        command_permissions: {
            save: null,
            patchnote: null,
            rappel: null,
            parrainage: null,
        }
    },
     'referral': {
        enabled: true,
        referral_code: null,
        referral_count: 0,
        command_permissions: {
            parrainage: null,
        }
    },
};

export function initializeDatabase() {
    createConfigTable();
    console.log('[Database] Initialisation de la base de données terminée.');
}

// --- Global Settings ---

export function getGlobalAiStatus(): { disabled: boolean; reason: string | null } {
    try {
        const stmt = db.prepare("SELECT value, reason FROM global_settings WHERE key = 'ai_disabled'");
        const row = stmt.get() as { value: string; reason: string | null } | undefined;
        return {
            disabled: row?.value === '1',
            reason: row?.reason || null
        };
    } catch (error) {
        console.error('[Database] Failed to get global AI status:', error);
        return { disabled: false, reason: null };
    }
}

export function setGlobalAiStatus(disabled: boolean, reason: string | null) {
    try {
        const stmt = db.prepare("UPDATE global_settings SET value = ?, reason = ? WHERE key = 'ai_disabled'");
        stmt.run(disabled ? '1' : '0', reason);
        console.log(`[Database] Global AI status set to: ${disabled ? 'DISABLED' : 'ENABLED'}. Reason: ${reason || 'N/A'}`);
    } catch (error) {
        console.error('[Database] Failed to set global AI status:', error);
    }
}

export function getPanelMessage(): PanelMessage | null {
    try {
        const stmt = db.prepare("SELECT value FROM global_settings WHERE key = 'panel_message'");
        const row = stmt.get() as { value: string | null } | undefined;
        if (row && row.value) {
            return JSON.parse(row.value) as PanelMessage;
        }
        return null;
    } catch (error) {
        console.error('[Database] Failed to get panel message:', error);
        return null;
    }
}

export function setPanelMessage(message: PanelMessage | null) {
    try {
        const value = message ? JSON.stringify(message) : null;
        const stmt = db.prepare("UPDATE global_settings SET value = ? WHERE key = 'panel_message'");
        stmt.run(value);
        console.log(`[Database] Panel message has been ${message ? 'set' : 'cleared'}.`);
    } catch (error) {
        console.error('[Database] Failed to set panel message:', error);
    }
}

// --- Dev Guilds ---
export function addDevGuild(guildId: string): void {
    const stmt = db.prepare('INSERT OR IGNORE INTO dev_guilds (guild_id) VALUES (?)');
    stmt.run(guildId);
}

export function removeDevGuild(guildId: string): void {
    const stmt = db.prepare('DELETE FROM dev_guilds WHERE guild_id = ?');
    stmt.run(guildId);
}

export function getDevGuilds(): string[] {
    const stmt = db.prepare('SELECT guild_id FROM dev_guilds');
    const rows = stmt.all() as { guild_id: string }[];
    return rows.map(row => row.guild_id);
}


// --- Server Configs ---

export function getServerConfig(guildId: string, module: Module): ModuleConfig | null {
    if (!guildId) {
        console.error(`[Database] Tentative de récupération de configuration avec un guildId non défini pour le module : ${module}.`);
        return defaultConfigs[module] || null;
    }
    try {
        const stmt = db.prepare('SELECT config, premium FROM server_configs WHERE guild_id = ? AND module = ?');
        const result = stmt.get(guildId, module) as { config: string, premium: number } | undefined;
        const defaultConfig = defaultConfigs[module] || {};

        if (result && result.config) {
            const config = JSON.parse(result.config);
            const finalConfig = { ...defaultConfig, ...config };

            // Deep merge for nested objects to prevent overwriting with partial data
            if (defaultConfig.command_permissions && config.command_permissions) {
                finalConfig.command_permissions = { ...defaultConfig.command_permissions, ...config.command_permissions };
            }
             if (defaultConfig.command_enabled && config.command_enabled) {
                finalConfig.command_enabled = { ...defaultConfig.command_enabled, ...config.command_enabled };
            }
            if (defaultConfig.actions && config.actions) {
                finalConfig.actions = { ...defaultConfig.actions, ...config.actions };
            }
             if (defaultConfig.log_settings && config.log_settings) {
                finalConfig.log_settings = { ...defaultConfig.log_settings, ...config.log_settings };
                for (const key of Object.keys(defaultConfig.log_settings)) {
                    if(config.log_settings[key]) {
                        finalConfig.log_settings[key] = { ...defaultConfig.log_settings[key], ...config.log_settings[key] };
                    }
                }
            }

            if (module === 'referral' && !finalConfig.referral_code) {
                finalConfig.referral_code = `MARCUS-${guildId.slice(-6)}`;
                updateServerConfig(guildId, module, finalConfig);
            }

            finalConfig.premium = !!result.premium;
            return finalConfig;
        } else {
            // If no config exists for this module, create the default one and return it.
            console.log(`[Database] Aucune config trouvée pour ${guildId} et le module ${module}. Création de la config par défaut.`);
            
            let configToSave = {...defaultConfig};
            if (module === 'referral') {
                configToSave.referral_code = `MARCUS-${guildId.slice(-6)}`;
            }

            updateServerConfig(guildId, module, configToSave);
            const premiumStatusStmt = db.prepare('SELECT premium FROM server_configs WHERE guild_id = ? LIMIT 1');
            const premiumResult = premiumStatusStmt.get(guildId) as { premium: number } | undefined;
            configToSave.premium = premiumResult ? !!premiumResult.premium : false;
            return configToSave;
        }
    } catch (error) {
        console.error(`[Database] Erreur lors de la récupération de la config pour ${guildId} (module: ${module}):`, error);
        return defaultConfigs[module] || null;
    }
}

export function updateServerConfig(guildId: string, module: Module, configData: ModuleConfig) {
    if (!guildId) {
        console.error(`[Database] Tentative de mise à jour de configuration avec un guildId non défini pour le module : ${module}.`);
        return;
    }
    try {
        const { premium, ...restConfig } = configData;
        const configString = JSON.stringify(restConfig);
        
        const stmt = db.prepare(`
            INSERT INTO server_configs (guild_id, module, config)
            VALUES (?, ?, ?)
            ON CONFLICT(guild_id, module) DO UPDATE SET config = excluded.config;
        `);
        stmt.run(guildId, module, configString);
    } catch (error) {
        console.error(`[Database] Erreur lors de la mise à jour de la config pour ${guildId} (module: ${module}):`, error);
    }
}

export function addKnowledgeBaseItem(guildId: string, newItem: KnowledgeBaseItem): void {
    try {
        const currentConfig = getServerConfig(guildId, 'conversational-agent');
        if (!currentConfig) throw new Error('Config not found for conversational-agent');

        const newKnowledgeBase = [...(currentConfig.knowledge_base || []), newItem];
        const newConfig = { ...currentConfig, knowledge_base: newKnowledgeBase };

        updateServerConfig(guildId, 'conversational-agent', newConfig);
        console.log(`[Database] Added new knowledge item for guild ${guildId}`);
    } catch (error) {
        console.error(`[Database] Error adding knowledge item for guild ${guildId}:`, error);
    }
}


export function setupDefaultConfigs(guildId: string) {
    const stmt = db.prepare('SELECT 1 FROM server_configs WHERE guild_id = ? AND module = ?');
    
    for (const moduleName of Object.keys(defaultConfigs) as Module[]) {
        const existing = stmt.get(guildId, moduleName);
        if (!existing) {
            console.log(`[Database] Adding default config for module '${moduleName}' for guild ${guildId}`);
            updateServerConfig(guildId, moduleName, defaultConfigs[moduleName]!);
        }
    }
}

export async function syncGuilds(client: Client) {
    console.log('[Database] Synchronisation des serveurs...');
    const guilds = await client.guilds.fetch();

    for (const oauthGuild of guilds.values()) {
        setupDefaultConfigs(oauthGuild.id);
    }
    console.log('[Database] Synchronisation des serveurs terminée.');
}

export function getAllBotServers(): { id: string; name: string; icon: string | null }[] {
    try {
        const stmt = db.prepare('SELECT DISTINCT guild_id FROM server_configs');
        const rows = stmt.all() as { guild_id: string }[];
        return rows.map(row => ({ id: row.guild_id, name: 'Unknown Server', icon: null }));
    } catch (error) {
        console.error('[Database] Erreur lors de la récupération de tous les serveurs:', error);
        return [];
    }
}

export function setPremiumStatus(guildId: string, isPremium: boolean) {
    try {
        const stmt = db.prepare(`UPDATE server_configs SET premium = ? WHERE guild_id = ?`);
        stmt.run(isPremium ? 1 : 0, guildId);
        console.log(`[Database] Statut premium mis à jour à '${isPremium}' pour le serveur ${guildId}.`);
    } catch (error) {
        console.error(`[Database] Erreur lors de la mise à jour du statut premium pour ${guildId}:`, error);
    }
}

export function giveTesterStatus(userId: string, guildId: string, expiresAt: Date | null) {
    try {
        const stmt = db.prepare(`
            INSERT INTO testers (user_id, guild_id, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, guild_id) DO UPDATE SET expires_at = excluded.expires_at;
        `);
        stmt.run(userId, guildId, expiresAt ? expiresAt.toISOString() : null);
    } catch (error) {
        console.error(`[Database] Erreur lors de l'attribution du statut de testeur à ${userId}:`, error);
    }
}

export function revokeTesterStatus(userId: string, guildId: string) {
    try {
        const stmt = db.prepare('DELETE FROM testers WHERE user_id = ? AND guild_id = ?');
        stmt.run(userId, guildId);
    } catch (error) {
        console.error(`[Database] Erreur lors de la révocation du statut de testeur pour ${userId}:`, error);
    }
}

export function checkTesterStatus(userId: string, guildId: string): { isTester: boolean; expires_at: Date | null } {
    try {
        const stmt = db.prepare('SELECT expires_at FROM testers WHERE user_id = ? AND guild_id = ?');
        const row = stmt.get(userId, guildId) as { expires_at: string | null } | undefined;

        if (!row) {
            return { isTester: false, expires_at: null };
        }

        if (row.expires_at === null) {
            return { isTester: true, expires_at: null };
        }

        const expiresAt = new Date(row.expires_at);
        if (expiresAt > new Date()) {
            return { isTester: true, expires_at: expiresAt };
        } else {
            revokeTesterStatus(userId, guildId);
            return { isTester: false, expires_at: null };
        }
    } catch (error) {
        console.error(`[Database] Erreur lors de la vérification du statut de testeur pour ${userId}:`, error);
        return { isTester: false, expires_at: null };
    }
}

export function getPersonasForGuild(guildId: string): Persona[] {
    const stmt = db.prepare('SELECT * FROM ai_personas WHERE guild_id = ?');
    return stmt.all(guildId) as Persona[];
}

export function createPersona(persona: Omit<Persona, 'created_at'>): void {
    const stmt = db.prepare(`
        INSERT INTO ai_personas (id, guild_id, name, persona_prompt, creator_id, active_channel_id, avatar_url, role_id, bot_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(persona.id, persona.guild_id, persona.name, persona.persona_prompt, persona.creator_id, persona.active_channel_id, persona.avatar_url, persona.role_id, persona.bot_token);
}

export function updatePersona(id: string, updates: Partial<Omit<Persona, 'id' | 'guild_id' | 'creator_id'>>): void {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE ai_personas SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
}

export function deletePersona(id: string): void {
    const stmt = db.prepare('DELETE FROM ai_personas WHERE id = ?');
    stmt.run(id);
}

export function getMemoriesForPersona(personaId: string, userIds: (string | null)[]): PersonaMemory[] {
    // Ensure userIds always contains at least one value to prevent SQL syntax errors, even if it's a value that won't match (like NULL for user_id)
    const placeholders = userIds.length > 0 ? userIds.map(() => '?').join(',') : 'NULL';
    
    const query = `
        SELECT * FROM persona_memories 
        WHERE persona_id = ? AND (user_id IN (${placeholders}) OR user_id IS NULL)
        ORDER BY salience_score DESC, last_accessed_at DESC 
        LIMIT 20
    `;
    
    const params: (string | number | null)[] = [personaId, ...userIds];
    
    const stmt = db.prepare(query);
    const memories = stmt.all(...params) as PersonaMemory[];
    
    // Touch memories to update last_accessed_at
    if (memories.length > 0) {
        const touchStmt = db.prepare(`UPDATE persona_memories SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`);
        const touchTransaction = db.transaction((mems) => {
            for (const mem of mems) touchStmt.run(mem.id);
        });
        touchTransaction(memories);
    }

    return memories;
}


export function createMemory(memory: Omit<PersonaMemory, 'id' | 'created_at' | 'last_accessed_at'>): void {
    const stmt = db.prepare(`
        INSERT INTO persona_memories (persona_id, user_id, memory_type, content, salience_score)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(memory.persona_id, memory.user_id, memory.memory_type, memory.content, memory.salience_score);
}

export function createMultipleMemories(memories: Omit<PersonaMemory, 'id' | 'created_at' | 'last_accessed_at'>[]): void {
    const insert = db.prepare(`
        INSERT INTO persona_memories (persona_id, user_id, memory_type, content, salience_score)
        VALUES (@persona_id, @user_id, @memory_type, @content, @salience_score)
    `);
    const insertMany = db.transaction((mems) => {
        for (const mem of mems) insert.run(mem);
    });
    insertMany(memories);
}

export function createPremiumKey(generatedBy: string, expiresAt: Date | null): string {
    const key = `MARCUS-${randomBytes(8).toString('hex').toUpperCase()}`;
    const stmt = db.prepare('INSERT INTO premium_keys (key, generated_by, expires_at) VALUES (?, ?, ?)');
    stmt.run(key, generatedBy, expiresAt ? expiresAt.toISOString() : null);
    return key;
}

export function redeemPremiumKey(key: string, guildId: string, usedById: string): { success: boolean; message: string; expires_at?: Date | null; } {
    const stmt = db.prepare('SELECT * FROM premium_keys WHERE key = ?');
    const row = stmt.get(key) as { is_used: number; used_by_guild: string; expires_at: string | null } | undefined;

    if (!row) {
        return { success: false, message: 'Clé invalide.' };
    }

    if (row.is_used) {
        if (row.used_by_guild === guildId) {
            return { success: false, message: 'Cette clé a déjà été activée pour ce serveur.' };
        }
        return { success: false, message: 'Cette clé a déjà été utilisée par un autre serveur.' };
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;

    const updateStmt = db.prepare('UPDATE premium_keys SET is_used = TRUE, used_by_guild = ?, used_at = CURRENT_TIMESTAMP WHERE key = ?');
    updateStmt.run(guildId, key);

    setPremiumStatus(guildId, true);

    // After successfully redeeming a key, check if the redeemer should get tester status
    const supportServerId = process.env.SUPPORT_SERVER_ID;
    if (supportServerId && expiresAt) { // Only give tester status for non-lifetime keys
        console.log(`[+] Assigning tester status to ${usedById} on support server ${supportServerId}`);
        giveTesterStatus(usedById, supportServerId, expiresAt);
    }


    return { success: true, message: 'Clé premium activée avec succès !', expires_at: expiresAt };
}

export function getReferralCode(guildId: string): string {
    const config = getServerConfig(guildId, 'referral');
    return config?.referral_code || `MARCUS-${guildId.slice(-6)}`;
}

export async function applyReferral(referralCode: string, referredGuildId: string, referredOwnerId: string, client: Client): Promise<{ success: boolean; message: string }> {
    const getGuildIdStmt = db.prepare("SELECT guild_id FROM server_configs WHERE module = 'referral' AND json_extract(config, '$.referral_code') = ?");
    const sponsor = getGuildIdStmt.get(referralCode) as { guild_id: string } | undefined;

    if (!sponsor) {
        return { success: false, message: "Ce code de parrainage est invalide." };
    }

    const referringGuildId = sponsor.guild_id;

    if (referringGuildId === referredGuildId) {
        return { success: false, message: "Vous ne pouvez pas parrainer votre propre serveur." };
    }

    const checkReferredStmt = db.prepare("SELECT 1 FROM referrals WHERE referred_guild_id = ?");
    if (checkReferredStmt.get(referredGuildId)) {
        return { success: false, message: "Ce serveur a déjà été parrainé." };
    }
    
    const checkOwnerStmt = db.prepare("SELECT 1 FROM referrals WHERE referring_guild_id = ? AND referred_owner_id = ?");
    if(checkOwnerStmt.get(referringGuildId, referredOwnerId)) {
        return { success: false, message: "Vous ne pouvez pas parrainer un autre de vos serveurs avec ce code." };
    }

    const insertStmt = db.prepare("INSERT INTO referrals (referring_guild_id, referred_guild_id, referred_owner_id) VALUES (?, ?, ?)");
    insertStmt.run(referringGuildId, referredGuildId, referredOwnerId);

    // Check for reward
    const countStmt = db.prepare("SELECT COUNT(DISTINCT referred_owner_id) as count FROM referrals WHERE referring_guild_id = ?");
    const { count } = countStmt.get(referringGuildId) as { count: number };
    
    // Update count in config
    const referralConfig = getServerConfig(referringGuildId, 'referral');
    if (referralConfig) {
        updateServerConfig(referringGuildId, 'referral', { ...referralConfig, referral_count: count });
    }

    if (count >= 10) {
        try {
            const guild = await client.guilds.fetch(referringGuildId);
            const owner = await guild.fetchOwner();
            const premiumKey = createPremiumKey(`referral_reward_${referringGuildId}`, new Date(Date.now() + ms('30d')));

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 Récompense de Parrainage !')
                .setDescription(`Félicitations ! Vous avez parrainé 10 serveurs uniques. En récompense, voici une clé premium de 30 jours pour le serveur de votre choix.`)
                .addFields({ name: "Votre Clé", value: `\`\`\`${premiumKey}\`\`\`` });

            await owner.send({ embeds: [embed] });

            // Reset referrals for this guild to prevent spamming rewards
            const deleteReferralsStmt = db.prepare("DELETE FROM referrals WHERE referring_guild_id = ?");
            deleteReferralsStmt.run(referringGuildId);
            if (referralConfig) {
                updateServerConfig(referringGuildId, 'referral', { ...referralConfig, referral_count: 0 });
            }
            
            return { success: true, message: "Parrainage appliqué avec succès ! Une récompense a été envoyée au propriétaire du serveur parrain." };

        } catch (e) {
             console.error("[Referral Reward] Failed to send reward DM:", e);
             return { success: true, message: "Parrainage appliqué avec succès ! La récompense n'a pas pu être envoyée par MP." };
        }
    }

    return { success: true, message: "Merci ! Votre parrainage a bien été pris en compte." };
}

// --- Delegated Permissions ---

export function grantPermission(userId: string, permissionKey: 'genpremium' | 'botrestart', grantedBy: string): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO delegated_permissions (user_id, permission_key, granted_by) VALUES (?, ?, ?)');
    stmt.run(userId, permissionKey, grantedBy);
}

export function revokePermission(userId: string, permissionKey: 'genpremium' | 'botrestart'): void {
    const stmt = db.prepare('DELETE FROM delegated_permissions WHERE user_id = ? AND permission_key = ?');
    stmt.run(userId, permissionKey);
}

export function hasPermission(userId: string, permissionKey: 'genpremium' | 'botrestart'): boolean {
    const stmt = db.prepare('SELECT 1 FROM delegated_permissions WHERE user_id = ? AND permission_key = ?');
    const result = stmt.get(userId, permissionKey);
    return !!result;
}

export function getDelegatedUsersForPermission(permissionKey: 'genpremium' | 'botrestart'): string[] {
    const stmt = db.prepare('SELECT user_id FROM delegated_permissions WHERE permission_key = ?');
    const rows = stmt.all(permissionKey) as { user_id: string }[];
    return rows.map(row => row.user_id);
}


// --- Sanction History ---

export function recordSanction(sanction: Omit<SanctionHistoryEntry, 'id' | 'timestamp'>) {
    const stmt = db.prepare(`
        INSERT INTO sanction_history (guild_id, user_id, moderator_id, action_type, reason, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
        sanction.guild_id,
        sanction.user_id,
        sanction.moderator_id,
        sanction.action_type,
        sanction.reason,
        sanction.duration_seconds
    );
}

export function getUserSanctionHistory(guildId: string, userId: string): SanctionHistoryEntry[] {
    const stmt = db.prepare(`
        SELECT * FROM sanction_history
        WHERE guild_id = ? AND user_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
    `);
    return stmt.all(guildId, userId) as SanctionHistoryEntry[];
}


// --- Lock System ---
export function isChannelLocked(channelId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM locked_channels WHERE channel_id = ?');
    return !!stmt.get(channelId);
}

export function lockChannel(channelId: string, originalPermissions: string): void {
    const stmt = db.prepare('INSERT INTO locked_channels (channel_id, original_permissions) VALUES (?, ?)');
    stmt.run(channelId, originalPermissions);
}

export function unlockChannel(channelId: string): string | null {
    const stmt = db.prepare('SELECT original_permissions FROM locked_channels WHERE channel_id = ?');
    const row = stmt.get(channelId) as { original_permissions: string } | undefined;

    if (row) {
        const deleteStmt = db.prepare('DELETE FROM locked_channels WHERE channel_id = ?');
        deleteStmt.run(channelId);
        return row.original_permissions;
    }
    return null;
}

// --- Leveling System ---
let clientInstance: Client | null = null;
export function setClientInstance(client: Client) {
    clientInstance = client;
}

const calculateRequiredXp = (level: number) => 5 * (level ** 2) + 50 * level + 100;

export function getUserLevel(userId: string, guildId: string): UserLevel {
    let stmt = db.prepare('SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?');
    let user = stmt.get(userId, guildId) as { xp: number, level: number } | undefined;
    
    if (!user) {
        user = { xp: 0, level: 0 };
    }

    return {
        ...user,
        requiredXp: calculateRequiredXp(user.level),
    };
}

export const updateUserXP = db.transaction((userId: string, guildId: string, xpToModify: number) => {
    
    const stmt = db.prepare(`
        INSERT INTO user_levels (user_id, guild_id, xp, level)
        VALUES (?, ?, ?, 0)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET
        xp = xp + excluded.xp;
    `);
    stmt.run(userId, guildId, xpToModify);

    // After updating, check for level up/down
    const { xp, level } = getUserLevel(userId, guildId);
    let requiredXp = calculateRequiredXp(level);
    
    if (xp >= requiredXp) {
        let newLevel = level;
        let currentXpForLeveling = xp;
        while (currentXpForLeveling >= requiredXp) {
            currentXpForLeveling -= requiredXp;
            newLevel++;
            requiredXp = calculateRequiredXp(newLevel);
        }
        
        if (newLevel > level) {
            const updateLevelStmt = db.prepare('UPDATE user_levels SET level = ? WHERE user_id = ? AND guild_id = ?');
            updateLevelStmt.run(newLevel, userId, guildId);
            
            console.log(`[Leveling] ${userId} has leveled up to level ${newLevel} in guild ${guildId}!`);
            
            if (clientInstance) {
                clientInstance.users.fetch(userId).then(user => {
                    clientInstance!.guilds.fetch(guildId).then(guild => {
                        clientInstance!.emit('levelUp', user, guild, newLevel);
                    });
                }).catch(console.error);
            }
        }
    }
});


export function getUserRank(userId: string, guildId: string): number {
    const stmt = db.prepare(`
        SELECT rank FROM (
            SELECT user_id, RANK() OVER (ORDER BY xp DESC) as rank 
            FROM user_levels WHERE guild_id = ?
        ) WHERE user_id = ?
    `);
    const result = stmt.get(guildId, userId) as { rank: number } | undefined;
    return result?.rank || 1;
}

export function getGuildLeaderboard(guildId: string, limit: number = 10): (UserLevel & { user_id: string })[] {
    const stmt = db.prepare(`
        SELECT user_id, xp, level FROM user_levels
        WHERE guild_id = ?
        ORDER BY xp DESC
        LIMIT ?
    `);
    const rows = stmt.all(guildId, limit) as { user_id: string; xp: number; level: number }[];
    return rows.map(row => ({
        ...row,
        requiredXp: calculateRequiredXp(row.level)
    }));
}
