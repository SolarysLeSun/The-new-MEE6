
import { createCanvas, loadImage } from 'canvas'
import type { NextRequest } from 'next/server'
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper function to wrap text
function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    const maxLines = 3;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            if (lineCount < maxLines) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                lineCount++;
            }
        } else {
            line = testLine;
        }
    }
    if (lineCount < maxLines) {
        context.fillText(line, x, y);
    } else {
        // Add ellipsis if text is truncated
        const lastLine = context.measureText(line).width > maxWidth ? line.substring(0, line.length - 3) + '...' : line;
        context.fillText(lastLine, x, y);
    }
}


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const authorName = searchParams.get('authorName') || 'Utilisateur';
        const authorAvatar = searchParams.get('authorAvatar');
        const message = searchParams.get('message') || '...';
        const timestamp = parseInt(searchParams.get('timestamp') || '0', 10);

        const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true, locale: fr }) : 'un instant';
        
        const width = 500;
        const height = 280;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1E1F22';
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);

        // Header
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText('Rappel', 60, 48);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(24, 70);
        ctx.lineTo(width - 24, 70);
        ctx.stroke();

        // Content
        ctx.fillStyle = '#DCDDDE';
        ctx.font = '18px "Inter", sans-serif';
        wrapText(ctx, message, 24, 120, 452, 24);

        // Footer
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(24, height - 70);
        ctx.lineTo(width - 24, height - 70);
        ctx.stroke();

        if (authorAvatar) {
            const avatar = await loadImage(authorAvatar);
            ctx.save();
            ctx.beginPath();
            ctx.arc(48, height - 40, 16, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 32, height - 56, 32, 32);
            ctx.restore();
        }

        ctx.fillStyle = '#B9BBBE';
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillText(`Rappel pour ${authorName}, défini ${timeAgo}.`, 76, height - 33);

        const buffer = canvas.toBuffer('image/png');

        return new Response(buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (err) {
        console.error("Error generating reminder card:", err);
        return new Response('Erreur interne du serveur', { status: 500 });
    }
}
