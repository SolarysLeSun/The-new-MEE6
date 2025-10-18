

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
    | 'faq-navigation';

export interface ModuleConfig {
  [key: string]: any; // Pour une flexibilité maximale
}

export type DefaultConfigs = {
    [key in Module]?: ModuleConfig;
}


// --- Types pour les modules spécifiques ---

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

export interface LevelingConfig {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
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
}
