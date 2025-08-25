
import fetch from 'node-fetch';
import { randomBytes, createHmac } from 'crypto';

// This secret should be in your .env file and be a long, random string.
const PANEL_JWT_SECRET = process.env.PANEL_JWT_SECRET || 'default-super-secret-for-dev-only';

// --- Bot Authentication with Discord API ---

let botAccessToken: string | null = null;
let tokenExpiry: number | null = null;

// This function will be called once at bot startup
export async function initializeBotAuth() {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be defined in .env');
    }

    try {
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'bot applications.commands', // Important scopes for the bot itself
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
        // Set expiry to be slightly less than the actual expiry to be safe
        tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000; 

        console.log('[Auth] Successfully obtained bot access token.');
    } catch (error) {
        console.error('[Auth] Error during bot authentication:', error);
        throw error; // Re-throw to prevent the bot from starting in a bad state
    }
}

// Function to get the current token, refreshing if necessary
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
export function verifyAndConsumeAuthToken(token: string): { guildId: string; userId: string } | null {
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

// --- Panel Session Token (JWT-like) ---

function base64url(source: Buffer): string {
  return source.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generateAuthTokenForPanel(userId: string, guildId: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { userId, guildId, iat: Date.now() }; // No expiry, it's a long-lived session

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
        return null; // Invalid signature
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    return { userId: payload.userId, guildId: payload.guildId };
}
