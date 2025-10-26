

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Client, Guild, User, PermissionOverwriteManager, PermissionOverwrites, Collection, OverwriteResolvable, EmbedBuilder } from 'discord.js';
import type { Module, ModuleConfig, DefaultConfigs, SanctionHistoryEntry, KnowledgeBaseItem, SanctionPreset, AutoSanction, RoleReward, XPBoost, UserLevel, PanelMessage, LevelingConfig, WelcomeConfig, ConversationalAgentConfig, UserProfile, RoadmapItem, ShopItem, Ticket, StatsChannelsConfig, VoiceHubsConfig } from '../types';
import { randomBytes } from 'crypto';
import ms from 'ms';

// Assurez-vous que le répertoire de la base de données existe
const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'bot.db');
let db: Database.Database;

function connectDatabase() {
    try {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        console.log(`[Database] Connecté à la base de données SQLite sur ${dbPath}`);
    } catch (error: any) {
        if (error.code === 'SQLITE_CORRUPT') {
            console.error(`[FATAL] La base de données ${dbPath} est corrompue.`);
            const backupPath = `${dbPath}.corrupted-backup-${Date.now()}`;
            console.log(`[Database] Tentative de renommage du fichier corrompu en ${backupPath}`);
            try {
                fs.renameSync(dbPath, backupPath);
                console.log(`[Database] Fichier corrompu sauvegardé. Tentative de recréer une nouvelle base de données...`);
                db = new Database(dbPath);
                db.pragma('journal_mode = WAL');
                 console.log('[Database] Nouvelle base de données créée avec succès.');
            } catch (renameError) {
                console.error(`[FATAL] Impossible de renommer le fichier de base de données corrompu. Le bot ne peut pas démarrer.`, renameError);
                process.exit(1);
            }
        } else {
            console.error(`[FATAL] Erreur de base de données inconnue.`, error);
            process.exit(1);
        }
    }
}


// --- Schéma et Migration de la Base de Données ---
const upgradeSchema = () => {
    try {
        
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
        if (configColumns.length > 0 && !configColumns.some(col => col.name === 'premium')) {
            console.log('[Database] Mise à jour du schéma : Ajout de la colonne "premium" à server_configs.');
            db.exec('ALTER TABLE server_configs ADD COLUMN premium BOOLEAN DEFAULT FALSE');
        }
        if (configColumns.length > 0 && !configColumns.some(col => col.name === 'premium_expires_at')) {
            console.log('[Database] Mise à jour du schéma : Ajout de la colonne "premium_expires_at" à server_configs.');
            db.exec('ALTER TABLE server_configs ADD COLUMN premium_expires_at DATETIME');
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
        if (keyColumns.length > 0 && !keyColumns.some(col => col.name === 'expires_at')) {
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
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY NOT NULL,
                bio TEXT,
                links TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] La table "user_profiles" est prête.');

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

        db.exec(`
            CREATE TABLE IF NOT EXISTS role_memory (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role_ids TEXT NOT NULL,
                saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id)
            );
        `);
        console.log('[Database] La table "role_memory" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS bot_bans (
                user_id TEXT PRIMARY KEY NOT NULL,
                banned_by TEXT NOT NULL,
                reason TEXT,
                banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] Table "bot_bans" is ready.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS owner_trials (
                owner_id TEXT PRIMARY KEY NOT NULL,
                claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] La table "owner_trials" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS roadmap_items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                status TEXT NOT NULL,
                sort_order INTEGER
            );
        `);
        console.log('[Database] Table "roadmap_items" is ready.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS api_keys (
                key TEXT NOT NULL,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME,
                PRIMARY KEY (user_id, guild_id)
            );
        `);
        console.log('[Database] Table "api_keys" is ready.');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS api_bans (
                user_id TEXT PRIMARY KEY,
                banned_by TEXT NOT NULL,
                reason TEXT,
                banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] Table "api_bans" is ready.');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                channel_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME,
                claimed_by TEXT,
                members TEXT,
                form_data TEXT
            );
        `);
        console.log('[Database] Table "tickets" is ready.');
        
         db.exec(`
            CREATE TABLE IF NOT EXISTS community_activity_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                timestamp_bucket DATETIME NOT NULL,
                message_count INTEGER DEFAULT 0,
                active_voice_members_count INTEGER DEFAULT 0,
                cumulative_voice_minutes INTEGER DEFAULT 0,
                active_text_members_count INTEGER DEFAULT 0,
                UNIQUE(guild_id, timestamp_bucket)
            );
        `);
        console.log('[Database] La table "community_activity_stats" est prête.');

        db.exec(`
            CREATE TABLE IF NOT EXISTS member_join_leave_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Database] La table "member_join_leave_events" est prête.');


        // Drop deprecated tables
        db.exec(`DROP TABLE IF EXISTS ai_personas;`);
        db.exec(`DROP TABLE IF EXISTS persona_memories;`);
        console.log('[Database] Tables obsolètes "ai_personas" et "persona_memories" supprimées.');


    } catch (error) {
        console.error('[Database] Erreur lors de la mise à jour du schéma:', error);
    }
};


const createConfigTable = () => {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS server_configs (
                guild_id TEXT NOT NULL,
                module TEXT NOT NULL,
                config TEXT NOT NULL,
                premium BOOLEAN DEFAULT FALSE,
                premium_expires_at DATETIME,
                PRIMARY KEY (guild_id, module)
            );
        `);
        console.log('[Database] La table "server_configs" est prête.');
    } catch(e) {
         console.error('[Database] Erreur lors de la création de la table de configuration :', e);
    }
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
            clearwarns: null,
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
            marcusfaq: null,
        },
        command_enabled: {
            invite: true,
            ping: true,
            help: true,
            marcus: true,
            traduire: true,
            say: true,
            level: true,
            marcusfaq: true,
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
        suggestion_prompt: 'Sois toujours très enthousiaste et utilise des emojis !',
    },
    'auto-moderation': {
        enabled: false,
        rules: [],
        log_channel_id: null,
        anti_spam_enabled: false,
        anti_spam_settings: {
            message_limit: 5,
            time_window_seconds: 5,
            action: 'warn',
        },
        exempt_roles: [],
        exempt_channels: [],
    },
    'gif-filter': {
        enabled: false,
        exempt_roles: [],
        exempt_channels: [],
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
        roles_to_lock: [],
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
            none: 'none',
            low: 'warn',
            medium: 'mute',
            high: 'mute',
            critical: 'kick'
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
        log_channel_id: null,
        moderator_roles: [],
        mention_moderators: true,
        embed_message: 'Cliquez sur le bouton pour créer un nouveau ticket.',
        channel_name_format: 'ticket-{user}-{id}',
        archive_summary: true,
        auto_delete_on_close: false,
        modal_title: 'Créer un ticket',
        custom_fields: [],
        validation_enabled: false,
        validation_channel_id: null,
        confirmation_message: "Votre demande a été envoyée pour validation. Vous recevrez une notification si elle est acceptée.",
        private_thread_enabled: true,
        private_thread_name_format: 'staff-{user}',
        command_permissions: {
            addticket: null,
            iaresume: null,
            ticket: null,
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
    'voice-hubs': {
        enabled: false,
        hub_category_id: null,
        dest_category_id: null,
        hubs: [],
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
        welcome_message: "Bienvenue sur le serveur, {user} !",
        use_card: true,
        card_background_url: null,
        card_text_color: '#FFFFFF',
        send_in_dm: false,
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
        allow_image_generation: true,
        data_sharing: {
            share_sanction_history: false,
            share_roles: true,
            share_level: true,
        },
        agent_actions: {
            can_give_xp: false,
            can_apply_sanctions: false,
            can_give_roles: false,
            can_change_nickname: false,
            can_send_dms: false,
        }
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
        premium: true,
        command_permissions: {
            ia: null
        },
    },
    'autoroles': {
        enabled: true,
        on_join_roles: [],
        on_voice_join_roles: [],
        ai_onboarding_enabled: false,
        ai_onboarding_questions: [],
        ai_onboarding_roles: [],
    },
    'server-identity': {
        enabled: false,
        nickname: null,
        avatar_url: null,
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
            parle: null,
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
        difficulty: 'medium',
        xp_per_message: 15,
        xp_per_reaction: 2,
        xp_per_welcome_reaction: 5,
        xp_per_minute_in_voice: 10,
        xp_boost_webcam_multiplier: 1.5,
        cooldown_seconds: 60,
        mention_user_on_levelup: true,
        level_up_frequency: 1,
        level_up_message: 'Félicitations {user}, vous avez atteint le niveau {level} !',
        level_up_channel_id: null,
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
        shop_enabled: false,
        shop_notification_channel_id: null,
        shop_notification_role_id: null,
        shop_items: [],
    },
    'fun-commands': {
        enabled: true,
        gaypride_enabled: false,
        oktban_enabled: false,
        poutine_enabled: false,
        command_permissions: {
            renameall: null,
            mutemass: null,
            reactbomb: null,
            react: null,
            randomnickname: null,
            'action-verite': null,
            de: null,
            pileouface: null,
            slots: null,
            payer: null,
            giveaway: null,
            airdrop: null,
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
            setprofil: null,
            profil: null,
            apikey: null,
        },
         command_enabled: {
            save: true,
            patchnote: true,
            rappel: true,
            setprofil: true,
            profil: true,
            apikey: true,
        },
    },
     'referral': {
        enabled: true,
        referral_code: null,
        referral_count: 0,
        command_permissions: {
            parrainage: null,
        }
    },
    'fortune-wheel': {
        enabled: true,
        wheels: [],
    },
    'role-memory': {
        enabled: true,
        premium: true,
        trigger_roles: [],
    },
    'embed-builder': {
        enabled: true,
    },
    'anti-afk': {
        enabled: false,
        timeout_minutes: 15,
        afk_channel_id: null,
    },
    'integrations': {
        enabled: false,
        rss_feeds: [],
    },
    'stats-channels': {
        enabled: false,
        category_id: null,
        channel_format: '📊 Membres : {membres}'
    },
    'community-analysis': {
        enabled: false,
        premium: true,
    }
};

export function initializeDatabase() {
    connectDatabase();
    createConfigTable();
    upgradeSchema(); // Ensure all tables are created/updated
    console.log('[Database] Initialisation de la base de données terminée.');
}

// --- Ticket System Functions ---

export function createTicket(ticketData: Omit<Ticket, 'created_at' | 'closed_at' | 'claimed_by'>) {
    const stmt = db.prepare(`
        INSERT INTO tickets (channel_id, guild_id, owner_id, status, members, form_data)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
        ticketData.channel_id,
        ticketData.guild_id,
        ticketData.owner_id,
        'open',
        JSON.stringify(ticketData.members || []),
        JSON.stringify(ticketData.form_data || {})
    );
}

export function getTicketByChannelId(channelId: string): Ticket | null {
    const stmt = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
    const row = stmt.get(channelId) as any;
    if (row) {
        row.members = JSON.parse(row.members);
        row.form_data = JSON.parse(row.form_data);
    }
    return row || null;
}

export function updateTicket(channelId: string, updates: Partial<Ticket>) {
    const fields = Object.keys(updates).filter(key => key !== 'channel_id');
    if (fields.length === 0) return;

    const setClauses = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
        const value = (updates as any)[field];
        return typeof value === 'object' ? JSON.stringify(value) : value;
    });

    const stmt = db.prepare(`UPDATE tickets SET ${setClauses} WHERE channel_id = ?`);
    stmt.run(...values, channelId);
}

export function deleteTicket(channelId: string) {
    const stmt = db.prepare('DELETE FROM tickets WHERE channel_id = ?');
    stmt.run(channelId);
}

// --- Join/Leave Event Logging ---
export function recordJoinLeaveEvent(guildId: string, userId: string, eventType: 'join' | 'leave') {
    try {
        const stmt = db.prepare(`
            INSERT INTO member_join_leave_events (guild_id, user_id, event_type)
            VALUES (?, ?, ?)
        `);
        stmt.run(guildId, userId, eventType);
    } catch (e) {
        console.error(`[Database] Failed to record join/leave event for user ${userId} in guild ${guildId}`, e);
    }
}

export function getJoinLeaveStats(guildId: string, timeWindowIso: string): { joins: number; leaves: number } {
    try {
        const joinStmt = db.prepare("SELECT COUNT(*) as count FROM member_join_leave_events WHERE guild_id = ? AND event_type = 'join' AND timestamp >= ?");
        const leaveStmt = db.prepare("SELECT COUNT(*) as count FROM member_join_leave_events WHERE guild_id = ? AND event_type = 'leave' AND timestamp >= ?");

        const joinResult = joinStmt.get(guildId, timeWindowIso) as { count: number };
        const leaveResult = leaveStmt.get(guildId, timeWindowIso) as { count: number };

        return {
            joins: joinResult?.count || 0,
            leaves: leaveResult?.count || 0,
        };
    } catch (e) {
        console.error(`[Database] Failed to get join/leave stats for guild ${guildId}`, e);
        return { joins: 0, leaves: 0 };
    }
}


// --- Roadmap Functions ---
export function getRoadmapItems(): RoadmapItem[] {
    const stmt = db.prepare('SELECT * FROM roadmap_items ORDER BY sort_order ASC');
    return stmt.all() as RoadmapItem[];
}

export function updateRoadmapItem(item: RoadmapItem) {
    const stmt = db.prepare(`
        UPDATE roadmap_items 
        SET title = ?, description = ?, icon = ?, status = ?, sort_order = ?
        WHERE id = ?
    `);
    stmt.run(item.title, item.description, item.icon, item.status, item.sort_order, item.id);
}

export function addRoadmapItem(item: RoadmapItem) {
    const stmt = db.prepare(`
        INSERT INTO roadmap_items (id, title, description, icon, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, item.title, item.description, item.icon, item.status, item.sort_order);
}

export function deleteRoadmapItem(id: string) {
    const stmt = db.prepare('DELETE FROM roadmap_items WHERE id = ?');
    stmt.run(id);
}



// --- Bot Ban System ---

export function addBotBan(userId: string, bannedBy: string, reason: string | null): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO bot_bans (user_id, banned_by, reason) VALUES (?, ?, ?)');
    stmt.run(userId, bannedBy, reason);
}

export function removeBotBan(userId: string): void {
    const stmt = db.prepare('DELETE FROM bot_bans WHERE user_id = ?');
    stmt.run(userId);
}

export function listBotBans(): { user_id: string; reason: string | null; banned_by: string; banned_at: string }[] {
    const stmt = db.prepare('SELECT user_id, reason, banned_by, banned_at FROM bot_bans ORDER BY banned_at DESC');
    return stmt.all() as { user_id: string; reason: string | null; banned_by: string; banned_at: string }[];
}

export function isBotBanned(userId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM bot_bans WHERE user_id = ?');
    return !!stmt.get(userId);
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
        const stmt = db.prepare('SELECT config, premium, premium_expires_at FROM server_configs WHERE guild_id = ? AND module = ?');
        const result = stmt.get(guildId, module) as { config: string, premium: number, premium_expires_at: string | null } | undefined;
        const defaultConfig = defaultConfigs[module] || {};

        let finalConfig: ModuleConfig;

        if (result && result.config) {
            const config = JSON.parse(result.config);
            finalConfig = { ...defaultConfig, ...config };

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
            if (defaultConfig.agent_actions && config.agent_actions) {
                finalConfig.agent_actions = { ...defaultConfig.agent_actions, ...config.agent_actions };
            }
            finalConfig.premium = !!result.premium;
            finalConfig.premium_expires_at = result.premium_expires_at;

        } else {
             finalConfig = {...defaultConfig};
             updateServerConfig(guildId, module, finalConfig);
             const premiumStatusStmt = db.prepare('SELECT premium, premium_expires_at FROM server_configs WHERE guild_id = ? LIMIT 1');
             const premiumResult = premiumStatusStmt.get(guildId) as { premium: number, premium_expires_at: string | null } | undefined;
             finalConfig.premium = premiumResult ? !!premiumResult.premium : false;
             finalConfig.premium_expires_at = premiumResult?.premium_expires_at;
        }

        // Handle referral code initialization
        if (module === 'referral' && !finalConfig.referral_code) {
            finalConfig.referral_code = `MARCUS-${guildId.slice(-6)}`;
            updateServerConfig(guildId, module, finalConfig);
        }

        // Check for premium expiration
        if (finalConfig.premium_expires_at) {
            const expiryDate = new Date(finalConfig.premium_expires_at);
            if (expiryDate < new Date()) {
                console.log(`[Premium] Le statut Premium pour le serveur ${guildId} a expiré. Désactivation.`);
                setPremiumStatus(guildId, false, null);
                finalConfig.premium = false;
                finalConfig.premium_expires_at = null;
            }
        }
        
        return finalConfig;

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
        const { premium, premium_expires_at, ...restConfig } = configData;
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
        const currentConfig = getServerConfig(guildId, 'conversational-agent') as ConversationalAgentConfig | null;
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

export function setPremiumStatus(guildId: string, isPremium: boolean, expiresAt: Date | null) {
    try {
        const stmt = db.prepare(`UPDATE server_configs SET premium = ?, premium_expires_at = ? WHERE guild_id = ?`);
        stmt.run(isPremium ? 1 : 0, expiresAt ? expiresAt.toISOString() : null, guildId);
        console.log(`[Database] Statut premium mis à jour à '${isPremium}' pour le serveur ${guildId}. Expiration: ${expiresAt || 'Jamais'}`);
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

// Deprecated functions for AI Personas are removed.

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

    setPremiumStatus(guildId, true, expiresAt);

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

    // --- Promotion de Départ Marcus ---
    try {
        const guild = await client.guilds.fetch(referringGuildId);
        if (guild.memberCount >= 30) {
            const countStmt = db.prepare("SELECT COUNT(DISTINCT referred_owner_id) as count FROM referrals WHERE referring_guild_id = ?");
            const { count } = countStmt.get(referringGuildId) as { count: number };

            if (count + 1 >= 2) { // The current referral makes it 2
                const owner = await guild.fetchOwner();
                
                // Grant 1 month premium to the server
                const premiumExpiry = new Date(Date.now() + ms('30d'));
                setPremiumStatus(referringGuildId, true, premiumExpiry);

                // Grant 1 year tester to owner
                const testerExpiry = new Date(Date.now() + ms('1y'));
                giveTesterStatus(owner.id, referringGuildId, testerExpiry);

                await owner.send({
                    embeds: [
                        new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle("🎉 Récompense Promotion de Départ !")
                        .setDescription(`Félicitations ! Votre serveur **${guild.name}** a rempli les conditions pour notre programme de promotion.\n\nVous avez reçu **1 an de statut Testeur** et votre serveur a reçu **1 mois de Premium** !`)
                        .setFooter({text: "Merci pour votre soutien à la croissance de Marcus !"})
                    ]
                });
            }
        }
    } catch(e) {
        console.error("[Promotion] Failed to check or grant promotion rewards:", e);
    }
    // --- Fin de la promotion ---


    const insertStmt = db.prepare("INSERT INTO referrals (referring_guild_id, referred_guild_id, referred_owner_id) VALUES (?, ?, ?)");
    insertStmt.run(referringGuildId, referredGuildId, referredOwnerId);

    // Update count in config
    const countStmt = db.prepare("SELECT COUNT(DISTINCT referred_owner_id) as count FROM referrals WHERE referring_guild_id = ?");
    const { count } = countStmt.get(referringGuildId) as { count: number };
    const referralConfig = getServerConfig(referringGuildId, 'referral');
    if (referralConfig) {
        updateServerConfig(referringGuildId, 'referral', { ...referralConfig, referral_count: count });
    }

    return { success: true, message: "Merci ! Votre parrainage a bien été pris en compte." };
}

// --- Delegated Permissions ---

export function grantPermission(userId: string, permissionKey: 'genpremium' | 'botrestart' | 'system', grantedBy: string): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO delegated_permissions (user_id, permission_key, granted_by) VALUES (?, ?, ?)');
    stmt.run(userId, permissionKey, grantedBy);
}

export function revokePermission(userId: string, permissionKey: 'genpremium' | 'botrestart' | 'system'): void {
    const stmt = db.prepare('DELETE FROM delegated_permissions WHERE user_id = ? AND permission_key = ?');
    stmt.run(userId, permissionKey);
}

export function hasPermission(userId: string, permissionKey: 'genpremium' | 'botrestart' | 'system'): boolean {
    const stmt = db.prepare('SELECT 1 FROM delegated_permissions WHERE user_id = ? AND permission_key = ?');
    const result = stmt.get(userId, permissionKey);
    return !!result;
}

export function getDelegatedUsersForPermission(permissionKey: 'genpremium' | 'botrestart' | 'system'): string[] {
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

export function getGuildWarnHistory(guildId: string): SanctionHistoryEntry[] {
    const stmt = db.prepare(`
        SELECT * FROM sanction_history
        WHERE guild_id = ? AND action_type = 'warn'
        ORDER BY timestamp DESC
    `);
    return stmt.all(guildId) as SanctionHistoryEntry[];
}

export function clearUserWarns(guildId: string, userId: string): number {
    const stmt = db.prepare(`
        DELETE FROM sanction_history 
        WHERE guild_id = ? AND user_id = ? AND action_type = 'warn'
    `);
    const result = stmt.run(guildId, userId);
    return result.changes;
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

// --- Role Memory System ---
export function saveUserRoles(guildId: string, userId: string, roleIds: string[]): void {
    const stmt = db.prepare(`
        INSERT INTO role_memory (guild_id, user_id, role_ids) 
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET role_ids = excluded.role_ids, saved_at = CURRENT_TIMESTAMP
    `);
    stmt.run(guildId, userId, JSON.stringify(roleIds));
}

export function getAndClearUserRoles(guildId: string, userId: string): string[] | null {
    const getStmt = db.prepare('SELECT role_ids FROM role_memory WHERE guild_id = ? AND user_id = ?');
    const row = getStmt.get(guildId, userId) as { role_ids: string } | undefined;
    
    if (row) {
        const deleteStmt = db.prepare('DELETE FROM role_memory WHERE guild_id = ? AND user_id = ?');
        deleteStmt.run(guildId, userId);
        return JSON.parse(row.role_ids);
    }
    return null;
}


// --- Leveling System ---
let clientInstance: Client | null = null;
export function setClientInstance(client: Client) {
    clientInstance = client;
}

const difficultyMultipliers = {
    easy: 0.75,
    medium: 1.0,
    hard: 1.5,
};
const ARCADE_XP_PER_LEVEL = 250;

const calculateRequiredXp = (level: number, difficulty: 'easy' | 'medium' | 'hard' | 'arcade' = 'medium') => {
    if (difficulty === 'arcade') {
        return ARCADE_XP_PER_LEVEL;
    }
    const multiplier = difficultyMultipliers[difficulty] || 1.0;
    return Math.floor((5 * (level ** 2) + 50 * level + 100) * multiplier);
};

export function getUserLevel(userId: string, guildId: string): UserLevel {
    const levelingConfig = getServerConfig(guildId, 'leveling') as LevelingConfig | null;
    const difficulty = levelingConfig?.difficulty || 'medium';

    let userStmt = db.prepare('SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?');
    let user = userStmt.get(userId, guildId) as { xp: number, level: number } | undefined;

    if (!user) {
        user = { xp: 0, level: 0 };
    }

    if (difficulty === 'arcade') {
        const level = Math.floor(user.xp / ARCADE_XP_PER_LEVEL);
        const xpInCurrentLevel = user.xp % ARCADE_XP_PER_LEVEL;
        const requiredXp = ARCADE_XP_PER_LEVEL;
        return { xp: xpInCurrentLevel, level, requiredXp, totalXp: user.xp };
    }


    let cumulativeXpForPreviousLevels = 0;
    for (let i = 0; i < user.level; i++) {
        cumulativeXpForPreviousLevels += calculateRequiredXp(i, difficulty);
    }

    const xpInCurrentLevel = user.xp - cumulativeXpForPreviousLevels;
    const requiredXpForNextLevel = calculateRequiredXp(user.level, difficulty);

    return {
        xp: xpInCurrentLevel,
        level: user.level,
        requiredXp: requiredXpForNextLevel,
        totalXp: user.xp,
    };
}

export function updateUserXP(userId: string, guildId: string, amount: number, mode: 'add' | 'set' = 'add') {
    if (!db) {
        console.error("[Database] Tentative d'accès à la base de données avant initialisation (updateUserXP).");
        return;
    }
    const transaction = db.transaction(() => {
        const getStmt = db.prepare('SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?');
        const user = getStmt.get(userId, guildId) as { xp: number; level: number } | undefined;

        let currentXp = user ? user.xp : 0;
        let newXp = mode === 'add' ? currentXp + amount : amount;

        if (newXp < 0) {
            newXp = 0;
        }

        const upsertStmt = db.prepare(`
            INSERT INTO user_levels (user_id, guild_id, xp, level)
            VALUES (?, ?, ?, 0)
            ON CONFLICT(user_id, guild_id) DO UPDATE SET xp = ?;
        `);
        upsertStmt.run(userId, guildId, newXp, newXp);

        checkLevel(userId, guildId);
    });

    transaction();
}

export function setUserLevel(userId: string, guildId: string, targetLevel: number) {
    if (!db) {
        console.error("[Database] Tentative d'accès à la base de données avant initialisation (setUserLevel).");
        return;
    }
    const transaction = db.transaction((uid: string, gid: string, tLevel: number) => {
        const levelingConfig = getServerConfig(gid, 'leveling') as LevelingConfig | null;
        const difficulty = levelingConfig?.difficulty || 'medium';

        let totalXpForTargetLevel = 0;
        if (difficulty === 'arcade') {
            totalXpForTargetLevel = tLevel * ARCADE_XP_PER_LEVEL;
        } else {
            for (let i = 0; i < tLevel; i++) {
                totalXpForTargetLevel += calculateRequiredXp(i, difficulty);
            }
        }

        const upsertStmt = db.prepare(`
            INSERT INTO user_levels (user_id, guild_id, xp, level)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, guild_id) DO UPDATE SET xp = ?, level = ?;
        `);
        upsertStmt.run(uid, gid, totalXpForTargetLevel, tLevel, totalXpForTargetLevel, tLevel);

        console.log(`[Leveling] User ${uid} in guild ${gid} has been set to level ${tLevel} with ${totalXpForTargetLevel} XP.`);
    });
    transaction(userId, guildId, targetLevel);
}

function checkLevel(userId: string, guildId: string) {
    const levelingConfig = getServerConfig(guildId, 'leveling') as LevelingConfig | null;
    const difficulty = levelingConfig?.difficulty || 'medium';
    
    const user = db.prepare('SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?').get(userId, guildId) as { xp: number, level: number };
    if (!user) return;

    let { xp: totalXp, level } = user;
    
    if (difficulty === 'arcade') {
        const newLevel = Math.floor(totalXp / ARCADE_XP_PER_LEVEL);
        if (newLevel > level) {
            db.prepare('UPDATE user_levels SET level = ? WHERE user_id = ? AND guild_id = ?').run(newLevel, userId, guildId);
             console.log(`[Leveling] ${userId} has reached level ${newLevel} in guild ${guildId}!`);
            if (clientInstance) {
                clientInstance.users.fetch(userId).then(userObj => {
                    clientInstance!.guilds.fetch(guildId).then(guildObj => {
                        clientInstance!.emit('levelUp', userObj, guildObj, newLevel);
                    });
                }).catch(console.error);
            }
        }
        return;
    }

    let requiredXpForNextLevel = calculateRequiredXp(level, difficulty);
    
    let cumulativeXpForCurrentLevel = 0;
    for (let i = 0; i < level; i++) {
        cumulativeXpForCurrentLevel += calculateRequiredXp(i, difficulty);
    }

    let changed = false;
    while (totalXp >= cumulativeXpForCurrentLevel + requiredXpForNextLevel) {
        cumulativeXpForCurrentLevel += requiredXpForNextLevel;
        level++;
        requiredXpForNextLevel = calculateRequiredXp(level, difficulty);
        changed = true;
    }

    while (level > 0 && totalXp < cumulativeXpForCurrentLevel) {
        level--;
        cumulativeXpForCurrentLevel -= calculateRequiredXp(level, difficulty);
        changed = true;
    }
    
    if (changed) {
        db.prepare('UPDATE user_levels SET level = ? WHERE user_id = ? AND guild_id = ?').run(level, userId, guildId);
        console.log(`[Leveling] ${userId} has reached level ${level} in guild ${guildId}!`);
        if (clientInstance && level > user.level) {
            clientInstance.users.fetch(userId).then(userObj => {
                clientInstance!.guilds.fetch(guildId).then(guildObj => {
                    clientInstance!.emit('levelUp', userObj, guildObj, level);
                });
            }).catch(console.error);
        }
    }
}

export function getUserRank(userId: string, guildId: string): number {
    const stmt = db.prepare(`
        SELECT rank FROM (
            SELECT user_id, RANK() OVER (ORDER BY xp DESC, user_id) as rank 
            FROM user_levels WHERE guild_id = ?
        ) WHERE user_id = ?
    `);
    const result = stmt.get(guildId, userId) as { rank: number } | undefined;
    return result?.rank || 1;
}

export function getGuildLeaderboard(guildId: string, limit: number = 10): UserLevel[] {
    const stmt = db.prepare(`
        SELECT user_id, xp, level FROM user_levels
        WHERE guild_id = ?
        ORDER BY xp DESC
        LIMIT ?
    `);
    const rows = stmt.all(guildId, limit) as { user_id: string; xp: number; level: number }[];
    
    return rows.map(row => {
        const userLevel = getUserLevel(row.user_id, guildId);
        return { ...userLevel, user_id: row.user_id };
    });
}

export function resetGuildXP(guildId: string): void {
    const stmt = db.prepare('DELETE FROM user_levels WHERE guild_id = ?');
    stmt.run(guildId);
}
export function resetUserXP(guildId: string, userId: string): void {
    const stmt = db.prepare('UPDATE user_levels SET xp = 0, level = 0 WHERE guild_id = ? AND user_id = ?');
    stmt.run(guildId, userId);
}
// Owner XP Boost
let ownerXPBoost = 1.0;
export function setOwnerXPBoost(multiplier: number) {
    ownerXPBoost = multiplier;
    console.log(`[XP Boost] Le multiplicateur d'XP du propriétaire a été défini sur x${multiplier}.`);
}
export function getOwnerXPBoost(): number {
    return ownerXPBoost;
}
// --- Trial System ---
export function hasClaimedTrial(ownerId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM owner_trials WHERE owner_id = ?');
    return !!stmt.get(ownerId);
}

export function claimTrial(ownerId: string): void {
    const stmt = db.prepare('INSERT OR IGNORE INTO owner_trials (owner_id) VALUES (?)');
    stmt.run(ownerId);
}


// --- User Profile System ---
export function getUserProfile(userId: string): UserProfile | null {
    const stmt = db.prepare('SELECT bio, links FROM user_profiles WHERE user_id = ?');
    const row = stmt.get(userId) as { bio: string | null; links: string | null } | undefined;
    if (!row) {
        return { user_id: userId, bio: null, links: [] };
    }
    return {
        user_id: userId,
        bio: row.bio,
        links: row.links ? JSON.parse(row.links) : [],
    };
}

export function updateUserProfile(userId: string, profileData: Partial<Omit<UserProfile, 'user_id'>>) {
    const { bio, links } = profileData;
    const stmt = db.prepare(`
        INSERT INTO user_profiles (user_id, bio, links, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            bio = excluded.bio,
            links = excluded.links,
            updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(userId, bio, JSON.stringify(links || []));
}

export function getCombinedUserLevel(userId: string): number {
    const stmt = db.prepare('SELECT level FROM user_levels WHERE user_id = ?');
    const rows = stmt.all(userId) as { level: number }[];
    return rows.reduce((sum, row) => sum + row.level, 0);
}

// --- Public API Key System ---

export function generateApiKey(userId: string, guildId: string): string {
    const key = `marcus_pub_${randomBytes(24).toString('hex')}`;
    const stmt = db.prepare(`
        INSERT INTO api_keys (user_id, guild_id, key) VALUES (?, ?, ?)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET key = excluded.key, created_at = CURRENT_TIMESTAMP;
    `);
    stmt.run(userId, guildId, key);
    return key;
}

export function getApiKeyInfo(key: string): { userId: string, guildId: string, isBanned: boolean } | null {
    const keyStmt = db.prepare('SELECT user_id, guild_id FROM api_keys WHERE key = ?');
    const keyInfo = keyStmt.get(key) as { user_id: string; guild_id: string; } | undefined;
    
    if (!keyInfo) return null;

    const banStmt = db.prepare('SELECT 1 FROM api_bans WHERE user_id = ?');
    const isBanned = !!banStmt.get(keyInfo.user_id);

    // Update last used timestamp
    db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = ?').run(key);

    return { ...keyInfo, isBanned };
}

export function addApiBan(userId: string, bannedBy: string, reason: string | null) {
    const stmt = db.prepare('INSERT OR REPLACE INTO api_bans (user_id, banned_by, reason) VALUES (?, ?, ?)');
    stmt.run(userId, bannedBy, reason);
}

export function removeApiBan(userId: string) {
    const stmt = db.prepare('DELETE FROM api_bans WHERE user_id = ?');
    stmt.run(userId);
}

export function listApiBans(): { user_id: string, reason: string | null }[] {
    return db.prepare('SELECT user_id, reason FROM api_bans').all() as any;
}
  

// --- Activity Stats ---
export { db };
