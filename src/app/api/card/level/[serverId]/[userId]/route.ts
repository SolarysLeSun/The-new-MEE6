import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs' // pas edge !
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { serverId: string, userId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const displayName = searchParams.get('displayName') || 'User'
    const avatarUrl = searchParams.get('avatarUrl')
    const level = parseInt(searchParams.get('level') || '1', 10)
    const xp = parseInt(searchParams.get('xp') || '0', 10)
    const requiredXp = parseInt(searchParams.get('requiredXp') || '100', 10)
    const rank = parseInt(searchParams.get('rank') || '0', 10);
    const barColor = searchParams.get('barColor') || '#ffffff'
    const textColor = searchParams.get('textColor') || '#ffffff'
    const backgroundUrl = searchParams.get('backgroundUrl');


    // Création du canvas
    const width = 900
    const height = 250
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Fond
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
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, width, height);
    }

    // Overlay semi-transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);


    // Avatar
    if (avatarUrl) {
      const avatar = await loadImage(avatarUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(125, 125, 80, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, 45, 45, 160, 160)
      ctx.restore()
      ctx.beginPath();
      ctx.arc(125, 125, 80, 0, Math.PI * 2, true);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // --- Textes ---
    ctx.fillStyle = textColor
    
    // Display Name
    ctx.font = 'bold 36px "Inter", sans-serif'
    ctx.fillText(displayName, 240, 105, 400) // Max width 400px

    // Rank & Level
    ctx.textAlign = 'right';
    ctx.font = 'bold 32px "Inter", sans-serif';
    ctx.fillText(`#${rank}`, width - 220, 80);
    ctx.fillText(`${level}`, width - 60, 80);
    
    ctx.font = 'semibold 14px "Inter", sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText('RANG', width - 220, 50);
    ctx.fillText('NIVEAU', width - 60, 50);
    ctx.globalAlpha = 1.0;


    // XP Text
    ctx.textAlign = 'left';
    ctx.font = 'normal 20px "Inter", sans-serif'
    const xpText = `${xp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`;
    ctx.fillText(xpText, width - 40 - ctx.measureText(xpText).width, 182);


    // Barre XP
    const barX = 240;
    const barY = 150;
    const barWidth = width - barX - 40;
    const barHeight = 25;
    const progress = Math.min(xp / requiredXp, 1)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    

    // Convertir en image PNG
    const buffer = canvas.toBuffer('image/png')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })
  } catch (err) {
    console.error("Error generating level card:", err)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
}
