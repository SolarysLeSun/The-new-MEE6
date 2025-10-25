
import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hasSpecialChars(name: string): boolean {
    return /[^\w\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name);
}

const medalColors = {
    '1': '#FFD700', // Gold
    '2': '#C0C0C0', // Silver
    '3': '#CD7F32'  // Bronze
};

export async function GET(req: NextRequest, { params }: { params: { serverId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const users = [
        {
            displayName: searchParams.get('user1_displayName') || 'N/A',
            username: searchParams.get('user1_username') || 'N/A',
            avatarUrl: searchParams.get('user1_avatarUrl'),
            level: searchParams.get('user1_level') || '1',
            rank: 1
        },
        {
            displayName: searchParams.get('user2_displayName') || 'N/A',
            username: searchParams.get('user2_username') || 'N/A',
            avatarUrl: searchParams.get('user2_avatarUrl'),
            level: searchParams.get('user2_level') || '1',
            rank: 2
        },
        {
            displayName: searchParams.get('user3_displayName') || 'N/A',
            username: searchParams.get('user3_username') || 'N/A',
            avatarUrl: searchParams.get('user3_avatarUrl'),
            level: searchParams.get('user3_level') || '1',
            rank: 3
        },
    ].filter(u => u.displayName !== 'N/A');

    const backgroundUrl = searchParams.get('backgroundUrl') || 'https://nightproject.nationquest.fr/levelbw.jpg';
    const serverName = searchParams.get('serverName') || 'Serveur';

    const width = 1000;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

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

    // --- Title ---
    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 Podium de ${serverName} 🏆`, width / 2, 80);


    // --- Podium Drawing Logic ---
    const podiumPositions = [
        { rank: 2, x: width * 0.25, y: height * 0.55, size: 100 },
        { rank: 1, x: width * 0.50, y: height * 0.45, size: 120 },
        { rank: 3, x: width * 0.75, y: height * 0.60, size: 90 },
    ];
    
    for (const pos of podiumPositions) {
        const user = users.find(u => u.rank === pos.rank);
        if (!user) continue;

        const nameToDisplay = hasSpecialChars(user.displayName) ? user.username : user.displayName;

        // Draw Avatar
        if (user.avatarUrl) {
            const avatar = await loadImage(user.avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.size / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, pos.x - pos.size / 2, pos.y - pos.size / 2, pos.size, pos.size);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.size / 2, 0, Math.PI * 2, true);
            ctx.strokeStyle = medalColors[pos.rank as keyof typeof medalColors];
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        // Draw Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.fillText(nameToDisplay, pos.x, pos.y + pos.size / 2 + 40);

        // Draw Level
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '22px "Inter", sans-serif';
        ctx.fillText(`Niveau ${user.level}`, pos.x, pos.y + pos.size / 2 + 75);
        
        // Draw Rank Medal
        ctx.fillStyle = medalColors[pos.rank as keyof typeof medalColors];
        ctx.beginPath();
        ctx.arc(pos.x + pos.size / 3, pos.y + pos.size / 3, 20, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText(`${pos.rank}`, pos.x + pos.size / 3, pos.y + pos.size / 3 + 8);
    }
    
    const buffer = canvas.toBuffer('image/png')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error("Error generating toplevel card:", err)
    return new Response('Erreur interne du serveur', { status: 500 })
  }
}
