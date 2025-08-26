'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface LevelInfo {
    level: number;
    xp: number;
    requiredXp: number;
}

interface UserInfo {
    displayName: string;
    avatarUrl: string;
    levelInfo: LevelInfo;
    rank: number;
    backgroundUrl?: string;
    barColor?: string;
    textColor?: string;
}

// A simple component to render the card based on fetched data
function LevelCard({ userInfo }: { userInfo: UserInfo }) {
    const { displayName, avatarUrl, levelInfo, rank, backgroundUrl, barColor, textColor } = userInfo;
    const progressPercent = (levelInfo.xp / levelInfo.requiredXp) * 100;

    const cardStyle = {
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
        backgroundColor: backgroundUrl ? '#1f2123' : '#23272A', // Darker if image fails to load or none provided
        color: textColor || '#FFFFFF',
    };

    return (
        <div style={cardStyle} className="w-[934px] h-[282px] flex items-center p-8 bg-cover bg-center relative font-sans">
             {/* Dimmed overlay */}
            <div className="absolute inset-0 bg-black/60"></div>
            
            <div className="relative z-10 flex items-center gap-8 w-full">
                {/* Avatar */}
                <Avatar className="w-48 h-48 border-4 border-white/80">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>

                {/* Info Section */}
                <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-4xl font-bold">{displayName}</span>
                        <div className="text-right">
                            <span className="text-muted-foreground" style={{color: textColor ? `${textColor}b3` : '#B9BBBE'}}>Niveau</span>
                            <span className="text-5xl font-bold ml-2">{levelInfo.level}</span>
                        </div>
                    </div>
                    <div className="flex justify-end items-center mb-2">
                         <span className="text-sm text-muted-foreground" style={{color: textColor ? `${textColor}b3` : '#B9BBBE'}}>{levelInfo.xp} / {levelInfo.requiredXp} XP</span>
                    </div>

                    <Progress value={progressPercent} className="h-8" style={{
                        // @ts-ignore
                        '--primary': barColor || '#FFFFFF'
                    }} />
                    
                    <div className="mt-4">
                        <span className="text-lg font-semibold text-muted-foreground" style={{color: textColor ? `${textColor}b3` : '#B9BBBE'}}>Classement #{rank}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function CardPage() {
    const params = useParams();
    const { serverId, userId } = params;
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId || !userId) return;

        // Fetch all necessary data from the query parameters
        // This is done to avoid making API calls from this public-facing page
        const query = new URLSearchParams(window.location.search);
        const userInfoData = {
            displayName: query.get('displayName') || 'Utilisateur',
            avatarUrl: query.get('avatarUrl') || '',
            levelInfo: {
                level: parseInt(query.get('level') || '0', 10),
                xp: parseInt(query.get('xp') || '0', 10),
                requiredXp: parseInt(query.get('requiredXp') || '100', 10),
            },
            rank: parseInt(query.get('rank') || '0', 10),
            backgroundUrl: query.get('backgroundUrl') || undefined,
            barColor: query.get('barColor') || undefined,
            textColor: query.get('textColor') || undefined,
        };
        setUserInfo(userInfoData as UserInfo);
        setLoading(false);
    }, [serverId, userId]);

    if (loading || !userInfo) {
        return <Skeleton className="w-[934px] h-[282px]" />;
    }

    return <LevelCard userInfo={userInfo} />;
}
