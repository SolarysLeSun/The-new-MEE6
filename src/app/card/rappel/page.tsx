
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function ReminderCardContent() {
    const searchParams = useSearchParams();

    // Safely get parameters with fallbacks
    const authorName = searchParams.get('authorName') || 'Utilisateur';
    const authorAvatar = searchParams.get('authorAvatar');
    const message = searchParams.get('message') || '...';
    const timestamp = parseInt(searchParams.get('timestamp') || '0', 10);
    
    const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true, locale: fr }) : 'un instant';

    return (
        <div style={{
            width: 500,
            height: 280,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, sans-serif',
            color: '#FFFFFF',
            backgroundColor: '#1E1F22',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '1rem',
            }}>
                <Clock style={{ width: '1.5rem', height: '1.5rem', color: 'hsl(var(--primary))' }} />
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Rappel</h1>
            </div>

            {/* Content */}
             <div style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingTop: '1rem',
                paddingBottom: '1rem'
             }}>
                <p style={{
                    fontSize: '1.125rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '100px',
                    overflow: 'hidden',
                }}>{message}</p>
             </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: 'auto',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
            }}>
                <Avatar style={{ width: '2rem', height: '2rem' }}>
                    {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
                    <AvatarFallback style={{ fontSize: '1rem' }}>{authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <p style={{ fontSize: '0.875rem', color: '#B9BBBE' }}>
                    Rappel pour <strong>{authorName}</strong>, défini {timeAgo}.
                </p>
            </div>
        </div>
    );
}


export default function ReminderCardPage() {
    return (
        <Suspense fallback={<div>Loading card...</div>}>
            <ReminderCardContent />
        </Suspense>
    );
}

