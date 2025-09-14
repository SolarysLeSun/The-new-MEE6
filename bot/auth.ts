
import fetch from 'node-fetch';
import { randomBytes, createHmac } from 'crypto';
import { getServerConfig } from '@/lib/db';
import { GuildMember, PermissionFlagsBits } from 'discord.js';

const PANEL_JWT_SECRET = process.env.PANEL_JWT_SECRET || 'default-super-secret-for-dev-only';

// --- Bot Authentication with Discord API ---
let botAccessToken: string | null = null;
let tokenExpiry: number | null = null;

export async function initializeBotAuth() {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be defined in .env');
    }

    try {
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'bot applications.commands',
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        const tokenData = await response.json() as any;

        if (!response.ok) {
            console.error('Failed to authenticate bot with Discord API:', tokenData);
            throw new Error(tokenData.error_description || 'Failed to fetch bot access token');
        }

        botAccessToken = tokenData.access_token;
        tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000; 

        console.log('[Auth] Successfully obtained bot access token.');
    } catch (error) {
        console.error('[Auth] Error during bot authentication:', error);
        throw error;
    }
}

export async function getBotAccessToken(): Promise<string> {
    if (!botAccessToken || (tokenExpiry && Date.now() > tokenExpiry)) {
        console.log('[Auth] Bot access token is expired or missing. Re-authenticating...');
        await initializeBotAuth();
    }
    return botAccessToken!;
}

// --- Panel User Authentication ---
interface AuthToken {
    userId: string;
    guildId: string;
    expires: number;
}

const activeTokens = new Map<string, AuthToken>();
const TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

export async function canUserAccessPanel(member: GuildMember): Promise<{ canAccess: boolean, reason: string | null }> {
    const guild = member.guild;
    const config = await getServerConfig(guild.id, 'panel-access');

    if (!config) {
        // Fallback to default: only administrators can access
        return { canAccess: member.permissions.has(PermissionFlagsBits.Administrator), reason: "Default admin permission." };
    }

    const userId = member.id;
    const userRoles = member.roles.cache.map(r => r.id);

    // Rule 1: Denied users are always blocked
    if (config.denied_users?.includes(userId)) {
        return { canAccess: false, reason: "User is explicitly denied access." };
    }

    // Rule 2: Denied roles are always blocked
    if (userRoles.some(roleId => config.denied_roles?.includes(roleId))) {
        return { canAccess: false, reason: "User has a role that is explicitly denied access." };
    }

    // Rule 3: If there's an allow list, user/role must be on it
    const hasAllowList = (config.allowed_users?.length > 0) || (config.allowed_roles?.length > 0);
    if (hasAllowList) {
        if (config.allowed_users?.includes(userId)) {
            return { canAccess: true, reason: "User is on the allow list." };
        }
        if (userRoles.some(roleId => config.allowed_roles?.includes(roleId))) {
            return { canAccess: true, reason: "User has a role on the allow list." };
        }
        return { canAccess: false, reason: "User or their roles are not on the explicit allow list." };
    }

    // Rule 4: Default behavior if no lists are set - only admins
    return { canAccess: member.permissions.has(PermissionFlagsBits.Administrator), reason: "Default admin permission (no specific rules set)." };
}


export async function generateAuthToken(member: GuildMember): Promise<{ token: string | null; error: string | null }> {
    const { canAccess, reason } = await canUserAccessPanel(member);

    if (!canAccess) {
        return { token: null, error: `You do not have permission to access the panel. Reason: ${reason}` };
    }
    
    const token = randomBytes(32).toString('hex');
    activeTokens.set(token, {
        userId: member.id,
        guildId: member.guild.id,
        expires: Date.now() + TOKEN_EXPIRATION_MS,
    });
    console.log(`[Auth] Generated token for user ${member.id} on guild ${member.guild.id}`);
    return { token, error: null };
}

export function verifyAndConsumeAuthToken(token: string): { guildId: string; userId: string } | null {
    const tokenData = activeTokens.get(token);

    if (!tokenData) {
        console.warn(`[Auth] Verification failed: Token not found.`);
        return null;
    }

    activeTokens.delete(token);

    if (Date.now() > tokenData.expires) {
        console.warn(`[Auth] Verification failed: Token expired for user ${tokenData.userId}.`);
        return null;
    }
    
    console.log(`[Auth] Successfully verified token for user ${tokenData.userId} on guild ${tokenData.guildId}.`);
    return { guildId: tokenData.guildId, userId: tokenData.userId };
}


// Periodically clean up expired tokens
setInterval(() => {
    const now = Date.now();
    for (const [token, tokenData] of activeTokens.entries()) {
        if (now > tokenData.expires) {
            activeTokens.delete(token);
            console.log(`[Auth] Cleaned up expired token for user ${tokenData.userId}.`);
        }
    }
}, 60 * 1000);

// --- Panel Session Token (JWT-like) ---
function base64url(source: Buffer): string {
  return source.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generateAuthTokenForPanel(userId: string, guildId: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { userId, guildId, iat: Date.now() };

    const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
    const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));

    const signature = createHmac('sha256', PANEL_JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
      
    const encodedSignature = base64url(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function verifyPanelToken(token: string): { userId: string; guildId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null; // Invalid token format
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    const signature = createHmac('sha256', PANEL_JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
      
    const expectedSignature = base64url(signature);

    if (encodedSignature !== expectedSignature) {
        console.warn('[Auth] Panel token verification failed: Invalid signature.');
        return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // We don't check for bans here anymore, as the initial token generation handles it.
    // A more robust system might re-check against the DB periodically.

    return { userId: payload.userId, guildId: payload.guildId };
}
