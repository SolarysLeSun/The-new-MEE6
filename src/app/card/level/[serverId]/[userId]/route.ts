
import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs' // pas edge !
export const dynamic = 'force-dynamic'

// Helper function to format large numbers
const formatXP = (num: number): string => {
    if (num < 1000) {
        return num.toString();
    }
    const k = num / 1000;
    return k.toFixed(1).replace(/\.0$/, '') + 'k';
};

// Helper function to check for complex characters
function hasSpecialChars(name: string): boolean {
    // This regex checks for characters that are not basic alphanumeric, spaces, or simple punctuation.
    // It's a simple way to catch most "fancy" fonts or special symbols.
    return /[^\w\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name);
}


export async function GET(req: NextRequest, { params }: { params: { serverId: string, userId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const displayName = searchParams.get('displayName') || 'User'
    const username = searchParams.get('username') || displayName // Fallback to displayName if username is not provided
    const avatarUrl = searchParams.get('avatarUrl')
    const level = parseInt(searchParams.get('level') || '1', 10)
    const xp = parseInt(searchParams.get('xp') || '0', 10)
    const requiredXp = parseInt(searchParams.get('requiredXp') || '100', 10)
    const totalXp = parseInt(searchParams.get('totalXp') || '0', 10)
    const rank = parseInt(searchParams.get('rank') || '0', 10);
    const barColor = searchParams.get('barColor') || '#e597c4'
    const textColor = searchParams.get('textColor') || '#e597c4'
    const backgroundUrl = searchParams.get('backgroundUrl') || 'https://nightproject.nationquest.fr/levelbw.jpg';

    // Decide which name to display
    const nameToDisplay = hasSpecialChars(displayName) ? username : displayName;


    // 1. Création du canvas
    const width = 1000
    const height = 300
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // 2. Fond
    if (backgroundUrl) {
        try {
            const background = await loadImage(backgroundUrl);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            console.warn(`[Card] Could not load background image: ${backgroundUrl}. Using solid color.`);
            ctx.fillStyle = '#23272A';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#23272A'; // Dark background
        ctx.fillRect(0, 0, width, height);
    }
    
    // Overlay semi-transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // 3. Avatar
    if (avatarUrl) {
      const avatar = await loadImage(avatarUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(150, 150, 100, 0, Math.PI * 2, true) // Avatar centered at 150,150 with 100px radius
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, 50, 50, 200, 200) // Draw the avatar
      ctx.restore()
      ctx.beginPath()
      ctx.arc(150, 150, 100, 0, Math.PI * 2, true)
      ctx.strokeStyle = barColor;
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // 4. Textes et Barre de progression
    const startingX = 300;

    // Nom de l'utilisateur
    ctx.fillStyle = textColor
    ctx.font = 'bold 52px "Inter", sans-serif'
    ctx.fillText(nameToDisplay, startingX, 120, 650) 

    // Barre XP
    const barX = startingX;
    const barY = 160;
    const barWidth = width - barX - 50;
    const barHeight = 40;
    const progress = requiredXp > 0 ? Math.min(xp / requiredXp, 1) : 0;

    // Texte XP / Total - Positioned above the bar
    const xpText = `${formatXP(xp)} / ${formatXP(requiredXp)} XP`;
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(xpText, barX + barWidth, barY - 15);


    // Fond de la barre
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barHeight/2);
    ctx.fill();
    
    // Progression de la barre
    if (progress > 0) {
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * progress, barHeight, barHeight/2);
      ctx.fill();
    }
    
    // Texte Rang
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Place', barX, barY + barHeight + 40);
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.fillText(rank.toString(), barX + ctx.measureText('Place').width + 15, barY + barHeight + 40);

    // Texte Niveau
    ctx.textAlign = 'right';
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillText('Niveau', width - 50 - ctx.measureText(level.toString()).width - 15, barY + barHeight + 40);
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.fillText(level.toString(), width - 50, barY + barHeight + 40);
    
    // 5. Convertir en image PNG
    const buffer = canvas.toBuffer('image/png')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error("Error generating level card:", err)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
}
