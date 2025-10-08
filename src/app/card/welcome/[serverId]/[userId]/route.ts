
import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs' 
export const dynamic = 'force-dynamic'

// Helper function to check for complex characters
function hasSpecialChars(name: string): boolean {
    return /[^\w\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name);
}

export async function GET(req: NextRequest, { params }: { params: { serverId: string, userId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const displayName = searchParams.get('displayName') || 'Nouveau Membre'
    const username = searchParams.get('username') || displayName
    const avatarUrl = searchParams.get('avatarUrl')
    const serverName = searchParams.get('serverName') || 'le serveur'
    const memberCount = parseInt(searchParams.get('memberCount') || '0', 10);
    const welcomeText = searchParams.get('welcomeText') || 'Bienvenue !';
    const textColor = searchParams.get('textColor') || '#ffffff'
    const backgroundUrl = searchParams.get('backgroundUrl');
    
    const nameToDisplay = hasSpecialChars(displayName) ? username : displayName;

    const width = 800
    const height = 400
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // --- Welcome Text ---
    ctx.font = 'bold 48px "Inter", sans-serif'
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.fillText(welcomeText.replace('{user}', nameToDisplay), width / 2, 80)
    
    // --- Avatar ---
    if (avatarUrl) {
      const avatar = await loadImage(avatarUrl)
      const avatarSize = 150;
      const avatarX = (width / 2) - (avatarSize / 2);
      const avatarY = 120;
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true)
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // --- User Name ---
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(nameToDisplay, width / 2, 320);

    // --- Member Count ---
    ctx.font = '24px "Inter", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Tu es le ${memberCount}ème membre !`, width / 2, 360);
    
    const buffer = canvas.toBuffer('image/png')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error("Error generating welcome card:", err)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
}

