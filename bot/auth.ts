
import fetch from 'node-fetch';
import { createHmac, randomBytes } from 'crypto';

const SECRET_KEY = randomBytes(64).toString('hex'); // Secret key for signing tokens

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
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
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

interface AuthData {
    userId: string;
    guildId: string;
    expires: number;
}

const TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

function signData(data: string): string {
    return createHmac('sha256', SECRET_KEY).update(data).digest('hex');
}

export function generateAuthToken(userId: string, guildId: string): string {
    const expires = Date.now() + TOKEN_EXPIRATION_MS;
    const data: AuthData = { userId, guildId, expires };
    const dataString = JSON.stringify(data);
    const signature = signData(dataString);
    const payload = Buffer.from(dataString).toString('base64');
    
    return `${payload}.${signature}`;
}

export function verifyAndConsumeAuthToken(token: string): AuthData | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) {
        return null;
    }

    const expectedSignature = signData(Buffer.from(payload, 'base64').toString('utf-8'));
    if (signature !== expectedSignature) {
        return null; // Invalid signature
    }

    try {
        const data: AuthData = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
        if (Date.now() > data.expires) {
            return null; // Token expired
        }
        return data;
    } catch (e) {
        return null; // Invalid JSON
    }
}
