

import type {
  SlashCommandBuilder,
  CommandInteraction,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
} from 'discord.js';

export interface Command {
  data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

// --- Types de Configuration ---

export type Module = 
    | 'moderation'
    | 'auto-moderation'
    | 'logs'
    | 'anti-bot'
    | 'captcha'
    | 'image-filter'
    | 'moderation-ai'
    | 'anti-raid'
    | 'link-scanner'
    | 'private-rooms'
    | 'smart-events'
    | 'smart-voice'
    | 'content-ai'
    | 'server-builder'
    | 'premium'
    | 'general-commands'
    | 'community-assistant'
    | 'auto-translation'
    | 'lock'
    | 'backup'
    | 'webcam'
    | 'welcome-message'
    | 'tester-commands'
    | 'conversational-agent'
    | 'suggestions'
    | 'ai-personas'
    | 'ai-assistant'
    | 'autoroles'
    | 'server-identity'
    | 'security-alerts'
    | 'moveall'
    | 'manual-voice-control'
    | 'announcements'
    | 'leveling'
    | 'fun-commands'
    | 'admin'
    | 'utils'
    | 'referral'
    | 'fortune-wheel'
    | 'role-memory'
    | 'embed-builder'
    | 'gif-filter'
    | 'faq-navigation'
    | 'anti-afk'
    | 'integrations'
    | 'stats-channels'
    | 'community-analysis';

export interface ModuleConfig {
  [key: string]: any; // Pour une flexibilité maximale
}

export type DefaultConfigs = {
    [key in Module]?: ModuleConfig;
}


// --- Types pour les modules spécifiques ---

export interface AutoModConfig {
    enabled: boolean;
    rules: any[]; // Remplacez `any` par un type plus spécifique si vous le souhaitez
    log_channel_id: string | null;
    anti_spam_enabled?: boolean;
    anti_spam_settings?: {
        message_limit: number;
        time_window_seconds: number;
        action: 'delete' | 'warn';
    };
    exempt_roles?: string[];
    exempt_channels?: string[];
}

export interface Persona {
    id: string;
    guild_id: string;
    name: string;
    persona_prompt: string;
    creator_id: string;
    created_at: string;
    active_channel_id: string | null;
    avatar_url: string | null;
    role_id: string | null;
    bot_token?: string | null;
}

export interface ConversationHistoryItem {
    user: string; // The user's display name
    content: string;
}

export interface PersonaMemory {
    id: number;
    persona_id: string;
    user_id?: string;
    memory_type: 'fact' | 'relationship' | 'interaction_summary' | 'preference';
    content: string;
    salience_score: number;
    last_accessed_at: string;
    created_at: string;
}

export interface SanctionHistoryEntry {
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string; // Can be a user ID or 'AUTOMOD'
    action_type: 'warn' | 'mute' | 'kick' | 'ban' | 'set';
    reason?: string;
    duration_seconds?: number;
    timestamp: string;
}

export interface SanctionPreset {
    name: string;
    action: 'warn' | 'mute' | 'kick' | 'ban';
    duration?: string; // e.g., '10m', '1h'
    reason: string;
}

export interface AutoSanction {
    warn_count: number;
    action: 'mute' | 'kick' | 'ban';
    duration?: string;
}

export interface RoleReward {
    level: number;
    role_id: string;
}

export interface XPBoost {
    role_id?: string;
    channel_id?: string;
    multiplier: number;
}

export interface UserLevel {
    xp: number; // XP in current level
    level: number;
    requiredXp: number; // XP to complete current level
    totalXp: number; // Total XP accumulated by the user
    user_id?: string; // Optional user_id for leaderboards
}

export interface CustomField {
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
}

export interface AiRoleMapping {
    id: string;
    role_id: string;
    keywords: string[];
}

export interface KnowledgeBaseItem {
    id: string;
    question: string;
    answer: string;
}

export interface PanelMessage {
    type: 'info' | 'warning' | 'error' | 'urgent' | 'update' | 'announcement';
    content: string;
    active: boolean;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: string;
  sort_order: number;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'role' | 'custom';
    reward_id: string; // Role ID if type is 'role', otherwise a custom identifier for the object
    duration?: string; // Optional duration for temporary roles (e.g., '7d', '24h')
}

export interface LevelingConfig {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard' | 'arcade';
    xp_per_message: number;
    xp_per_reaction: number;
    xp_per_welcome_reaction: number;
    xp_per_minute_in_voice: number;
    xp_boost_webcam_multiplier: number;
    cooldown_seconds: number;
    mention_user_on_levelup: boolean;
    level_up_frequency: number;
    level_up_message: string;
    level_up_channel_id: string | null;
    level_card_background_url: string | null;
    level_card_bar_color: string | null;
    level_card_text_color: string | null;
    ignored_channels: string[];
    role_rewards: RoleReward[];
    xp_boost_roles: XPBoost[];
    xp_boost_channels: XPBoost[];
    command_permissions: { [key: string]: string | null };
    // Shop
    shop_enabled?: boolean;
    shop_notification_channel_id?: string | null;
    shop_notification_role_id?: string | null;
    shop_items?: ShopItem[];
}

export interface WelcomeConfig {
    enabled: boolean;
    welcome_channel_id: string | null;
    welcome_message: string;
    use_card: boolean;
    card_background_url: string | null;
    card_text_color: string | null;
    send_in_dm: boolean;
}

export interface ConversationalAgentConfig {
    enabled: boolean;
    premium: boolean;
    agent_name: string;
    agent_role: string;
    agent_personality: string;
    custom_prompt: string;
    knowledge_base: KnowledgeBaseItem[];
    dedicated_channel_id: string | null;
    allow_imagination: boolean;
    allow_freewheeling: boolean;
    allow_image_generation: boolean;
    data_sharing: {
        share_sanction_history: boolean;
        share_roles: boolean;
        share_level: boolean;
    };
    agent_actions: {
        can_give_xp: boolean;
        can_apply_sanctions: boolean;
        can_give_roles: boolean;
        can_change_nickname: boolean;
        can_send_dms: boolean;
    };
}

export interface AntiAfkConfig {
    enabled: boolean;
    timeout_minutes: number;
    afk_channel_id: string | null;
}

// --- Embed Builder Specific Types ---
export interface EmbedField {
    id: string; // Used for React keys
    name: string;
    value: string;
    inline: boolean;
}

export interface EmbedButton {
    id: string; // Used for React keys
    label: string;
    style: 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';
    action_type: 'link' | 'give_role'; // More can be added later
    action_value: string; // URL for link, Role ID for give_role
    emoji: string;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    color?: number | string;
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
    };
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    footer?: {
        text: string;
        icon_url?: string;
    };
    timestamp?: boolean;
    fields?: EmbedField[];
}

export interface ProfileLink {
    label: string;
    url: string;
}

export interface UserProfile {
    user_id: string;
    bio: string | null;
    links: ProfileLink[];
}

export interface Ticket {
  channel_id: string;
  guild_id: string;
  owner_id: string;
  status: 'open' | 'claimed' | 'closed';
  created_at: string;
  closed_at?: string | null;
  claimed_by?: string | null;
  members: string[];
  form_data: Record<string, string>;
}

export interface TicketsConfig {
    enabled: boolean;
    creation_channel: string | null;
    category_id: string | null;
    log_channel_id: string | null;
    moderator_roles: string[];
    mention_moderators: boolean;
    modal_title: string;
    embed_message: string;
    channel_name_format: string;
    custom_fields: CustomField[];
    validation_enabled: boolean;
    validation_channel_id: string | null;
    confirmation_message: string;
    private_thread_enabled: boolean;
    private_thread_name_format: string;
    archive_summary: boolean;
    auto_delete_on_close: boolean;
    command_permissions: { [key: string]: string | null };
}
  
