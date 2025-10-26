
import express from 'express';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import FormData from 'form-data';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const WATCHDOG_PORT = 4400;
const TARGET_API_URL = `https://marcusbot.fr/api/ping`;
const CHECK_INTERVAL_MS = 60 * 1000; // 60 secondes
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1431575144526119085/YqdTfpW9VKDLr4k8n9R6m6p7YS5Bz2vBd8eKSNhKwsI-0WsjFBJO7_KL53u7rFbhckjJ';
const OWNER_ID_TO_PING = '556529963877138442';
const WATCHDOG_SECRET = process.env.WATCHDOG_SECRET;


let isRestarting = false;

async function sendWebhookNotification(title: string, reason: string, logs?: string) {
    if (!WEBHOOK_URL) return;

    const embed = {
        title: `🚨 ${title} 🚨`,
        description: `Le service de surveillance (Watchdog) a initié une action.`,
        color: title.includes('Redémarrage') ? 15158332 : 16776960, // Red for restart, Yellow for others
        fields: [
            {
                name: 'Raison / Commande',
                value: reason,
            },
        ],
        timestamp: new Date().toISOString(),
    };

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({
        content: `<@${OWNER_ID_TO_PING}>, une action a été effectuée.`,
        embeds: [embed],
    }));

    if (logs) {
        formData.append('file1', Buffer.from(logs), {
            contentType: 'text/plain',
            filename: 'logs.txt',
        });
    }

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData,
        });
         console.log(`[${new Date().toISOString()}] [Watchdog] Notification envoyée sur Discord.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [Watchdog] Impossible d'envoyer la notification webhook:`, error);
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
    
    let logs = 'Impossible de récupérer les logs.';
    try {
        logs = await new Promise((resolve, reject) => {
            exec('pm2 logs bot --lines 140 --nostream', (error, stdout, stderr) => {
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

    await sendWebhookNotification("Redémarrage Automatique du Bot Marcus", reason, logs);

    console.log(`[${timestamp}] [Watchdog] Executing "pm2 restart bot"...`);
    exec('pm2 restart bot', (error, stdout, stderr) => {
        if (error) {
            console.error(`[${timestamp}] [Watchdog] PM2 restart command failed: ${error.message}`);
            setTimeout(() => { isRestarting = false; }, 30000);
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
        }, 60000);
    });
}

function executeRemoteCommand(command: string, res: express.Response) {
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    let shellCommand = '';
    let notificationTitle = 'Commande à Distance';

    switch (command) {
        case 'pull-and-restart':
            shellCommand = 'git pull && npm run build && pm2 restart all';
            notificationTitle = 'Mise à jour et Redémarrage';
            break;
        case 'setup-cluster':
            shellCommand = 'pm2 delete all && pm2 start ecosystem.config.js';
            notificationTitle = 'Déploiement en Cluster';
            break;
        case 'setup-one':
            shellCommand = 'pm2 delete all && npm run bot:dev && npm run start && npm run watchdog';
            notificationTitle = 'Déploiement en Instance Unique';
            break;
        default:
            res.status(400).send('Commande invalide.');
            return;
    }
    
    res.status(202).send(`Commande '${command}' acceptée. Exécution en cours...`);
    console.log(`[${timestamp}] [Watchdog] Remote command '${command}' received and accepted.`);
    sendWebhookNotification(notificationTitle, `Exécution de la commande : \`${shellCommand}\``);

    exec(shellCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`[${timestamp}] [Watchdog] Erreur lors de l'exécution de la commande distante '${command}':`, error);
            sendWebhookNotification(`Erreur d'exécution de la commande '${command}'`, `Erreur: ${error.message}`, stderr);
            return;
        }
        console.log(`[${timestamp}] [Watchdog] Sortie de la commande '${command}':\n${stdout}`);
        if (stderr) {
            console.error(`[${timestamp}] [Watchdog] Erreur (stderr) de la commande '${command}':\n${stderr}`);
        }
        sendWebhookNotification(`Succès de la commande '${command}'`, `La commande s'est terminée avec succès.`, stdout);
    });
}

const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'watchdog_running' });
});

app.post('/execute', (req, res) => {
    const { command, secret } = req.query;

    if (!WATCHDOG_SECRET) {
        return res.status(500).send('Le secret du watchdog n\'est pas configuré sur le serveur.');
    }
    if (secret !== WATCHDOG_SECRET) {
        return res.status(401).send('Secret invalide.');
    }
    if (typeof command !== 'string') {
        return res.status(400).send('Paramètre de commande manquant ou invalide.');
    }
    
    executeRemoteCommand(command, res);
});


app.listen(WATCHDOG_PORT, () => {
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    console.log(`[${timestamp}] [Watchdog] Health check server listening on port ${WATCHDOG_PORT}`);
    console.log(`[${timestamp}] [Watchdog] Starting regular checks on ${TARGET_API_URL}`);
    
    setTimeout(checkApiHealth, 5000);
    setInterval(checkApiHealth, CHECK_INTERVAL_MS);
});
