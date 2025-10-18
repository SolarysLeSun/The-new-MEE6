
import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hasSpecialChars(name: string): boolean {
    return /[^\w\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name);
}

export async function GET(req: NextRequest, { params }: { params: { serverId: string, userId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const displayName = searchParams.get('displayName') || 'User'
    const username = searchParams.get('username') || displayName
    const avatarUrl = searchParams.get('avatarUrl')
    const level = parseInt(searchParams.get('level') || '1', 10)
    const rank = parseInt(searchParams.get('rank') || '0', 10);
    const barColor = searchParams.get('barColor') || '#e597c4'
    const textColor = searchParams.get('textColor') || '#e597c4'
    const backgroundUrl = searchParams.get('backgroundUrl');

    const nameToDisplay = hasSpecialChars(displayName) ? username : displayName;

    const width = 600
    const height = 300
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // --- Background ---
    if (backgroundUrl) {
        try {
            const background = await loadImage(backgroundUrl);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            ctx.fillStyle = '#23272A';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, width, height);
    }
    
    // --- Overlay ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // --- Avatar ---
    if (avatarUrl) {
      const avatar = await loadImage(avatarUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(width / 2, 110, 60, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, (width / 2) - 60, 50, 120, 120)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(width / 2, 110, 60, 0, Math.PI * 2, true)
      ctx.strokeStyle = barColor;
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    // --- "LEVEL UP!" Text ---
    ctx.font = 'bold 50px "Inter", sans-serif'
    ctx.textAlign = 'center'
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, barColor);
    ctx.fillStyle = gradient;
    ctx.fillText('LEVEL UP!', width / 2, 220);


    // --- User Name ---
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(nameToDisplay, width / 2, 35);
    
    // --- Level and Rank ---
    ctx.font = '20px "Inter", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    const levelText = `Niveau ${level}`;
    const rankText = `Rang #${rank}`;
    const textY = 260;
    
    ctx.textAlign = 'right';
    ctx.fillText(levelText, width / 2 - 15, textY);
    
    ctx.textAlign = 'left';
    ctx.fillText(rankText, width / 2 + 15, textY);
    
    const buffer = canvas.toBuffer('image/png')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error("Error generating level up card:", err)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
}
