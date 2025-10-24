
import express from 'express';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const WATCHDOG_PORT = 4400;
const TARGET_API_URL = `http://localhost:${process.env.BOT_API_PORT || 3630}/api/ping`;
const CHECK_INTERVAL_MS = 60 * 1000; // 60 secondes

let isRestarting = false;

async function checkApiHealth() {
    if (isRestarting) {
        console.log('[Watchdog] Restart in progress, skipping health check.');
        return;
    }

    console.log(`[Watchdog] Checking health of ${TARGET_API_URL}...`);

    try {
        const response = await fetch(TARGET_API_URL, { timeout: 5000 }); // 5 second timeout
        if (response.ok) {
            console.log('[Watchdog] API is healthy. Status:', response.status);
        } else {
            throw new Error(`API returned a non-ok status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Watchdog] Health check failed:', error.message);
        console.log('[Watchdog] API is down. Triggering restart...');
        restartBot();
    }
}

function restartBot() {
    isRestarting = true;
    console.log('[Watchdog] Executing "pm2 restart bot"...');

    exec('pm2 restart bot', (error, stdout, stderr) => {
        if (error) {
            console.error(`[Watchdog] PM2 restart command failed: ${error.message}`);
            // Reset flag even if restart fails, to allow for another attempt
            setTimeout(() => { isRestarting = false; }, 30000); // Wait 30s before allowing another restart
            return;
        }
        
        console.log(`[Watchdog] PM2 stdout: ${stdout}`);
        if (stderr) {
            console.error(`[Watchdog] PM2 stderr: ${stderr}`);
        }

        console.log('[Watchdog] Restart command sent. Waiting 1 minute before resuming health checks.');
        setTimeout(() => {
            isRestarting = false;
            console.log('[Watchdog] Resuming health checks.');
        }, 60000); // Cooldown period after restart
    });
}

const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'watchdog_running' });
});

app.listen(WATCHDOG_PORT, () => {
    console.log(`[Watchdog] Health check server listening on port ${WATCHDOG_PORT}`);
    console.log(`[Watchdog] Starting regular checks on ${TARGET_API_URL}`);
    
    // Initial check on startup after a small delay
    setTimeout(checkApiHealth, 5000);

    // Regular interval checks
    setInterval(checkApiHealth, CHECK_INTERVAL_MS);
});

    