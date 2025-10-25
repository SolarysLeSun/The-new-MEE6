
import express from 'express';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const WATCHDOG_PORT = 4400;
const TARGET_API_URL = `https://marcusbot.fr/api/ping`;
const CHECK_INTERVAL_MS = 60 * 1000; // 60 secondes
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1431575144526119085/YqdTfpW9VKDLr4k8n9R6m6p7YS5Bz2vBd8eKSNhKwsI-0WsjFBJO7_KL53u7rFbhckjJ';
const OWNER_ID_TO_PING = '556529963877138442';


let isRestarting = false;

async function sendWebhookNotification(reason: string, logs?: string) {
    if (!WEBHOOK_URL) return;

    const embed = {
        title: '🚨 Redémarrage Automatique du Bot Marcus 🚨',
        description: `Le service de surveillance (Watchdog) a redémarré le bot.`,
        color: 15158332, // Red
        fields: [
            {
                name: 'Raison de la Détection',
                value: reason,
            },
        ],
        timestamp: new Date().toISOString(),
    };
    
    if (logs) {
        embed.fields.push({
            name: 'Derniers Logs du Bot (pm2 logs bot --lines 50)',
            value: `\`\`\`\n${logs.substring(0, 1000)}\n\`\`\``,
        });
    }

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `<@${OWNER_ID_TO_PING}>`,
                embeds: [embed],
            }),
        });
         console.log(`[${new Date().toISOString()}] [Watchdog] Notification de redémarrage envoyée sur Discord.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [Watchdog] Impossible d\'envoyer la notification webhook:`, error);
    }
}


async function checkApiHealth() {
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    if (isRestarting) {
        console.log(`[${timestamp}] [Watchdog] Restart in progress, skipping health check.`);
        return;
    }

    console.log(`[${timestamp}] [Watchdog] Checking health of ${TARGET_API_URL}...`);

    try {
        const response = await fetch(TARGET_API_URL, { timeout: 10000 }); // 10 second timeout
        if (response.ok) {
            console.log(`[${timestamp}] [Watchdog] API is healthy. Status:`, response.status);
        } else {
            throw new Error(`API returned a non-ok status: ${response.status}`);
        }
    } catch (error: any) {
        console.error(`[${timestamp}] [Watchdog] Health check failed:`, error.message);
        console.log(`[${timestamp}] [Watchdog] API is down. Triggering restart...`);
        await restartBot(error.message);
    }
}

async function restartBot(reason: string) {
    isRestarting = true;
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // 1. Get logs first
    let logs = 'Impossible de récupérer les logs.';
    try {
        logs = await new Promise((resolve, reject) => {
            exec('pm2 logs bot --lines 50 --nostream', (error, stdout, stderr) => {
                if (error) {
                    reject(`Erreur d'exécution: ${error.message}\n${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    } catch (logError) {
        console.error(`[${timestamp}] [Watchdog] Erreur lors de la récupération des logs PM2 :`, logError);
    }

    // 2. Send notification
    await sendWebhookNotification(reason, logs);


    // 3. Execute restart
    console.log(`[${timestamp}] [Watchdog] Executing "pm2 restart bot"...`);
    exec('pm2 restart bot', (error, stdout, stderr) => {
        if (error) {
            console.error(`[${timestamp}] [Watchdog] PM2 restart command failed: ${error.message}`);
            // Reset flag even if restart fails, to allow for another attempt
            setTimeout(() => { isRestarting = false; }, 30000); // Wait 30s before allowing another restart
            return;
        }
        
        console.log(`[${timestamp}] [Watchdog] PM2 stdout: ${stdout}`);
        if (stderr) {
            console.error(`[${timestamp}] [Watchdog] PM2 stderr: ${stderr}`);
        }

        console.log(`[${timestamp}] [Watchdog] Restart command sent. Waiting 1 minute before resuming health checks.`);
        setTimeout(() => {
            isRestarting = false;
            console.log(`[${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] [Watchdog] Resuming health checks.`);
        }, 60000); // Cooldown period after restart
    });
}

const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'watchdog_running' });
});

app.listen(WATCHDOG_PORT, () => {
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    console.log(`[${timestamp}] [Watchdog] Health check server listening on port ${WATCHDOG_PORT}`);
    console.log(`[${timestamp}] [Watchdog] Starting regular checks on ${TARGET_API_URL}`);
    
    // Initial check on startup after a small delay
    setTimeout(checkApiHealth, 5000);

    // Regular interval checks
    setInterval(checkApiHealth, CHECK_INTERVAL_MS);
});
