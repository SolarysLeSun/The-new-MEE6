

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, ServerCrash, Trophy } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface LeaderboardEntry {
    rank: number;
    user: {
        id: string;
        username: string;
        displayName: string;
        tag: string;
        avatar: string | null;
    };
    level: number;
    xp: number;
    requiredXp: number;
}
interface ServerInfo {
    name: string;
    icon: string | null;
}

const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-400';
    return 'text-muted-foreground';
};

const LeaderboardSkeleton = () => (
    <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
            </div>
        ))}
    </div>
);

function hasSpecialChars(name: string): boolean {
    return /[^\w\s\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name);
}

export default function LevelScoreboardPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!serverId) return;
        
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [leaderboardRes, serverInfoRes] = await Promise.all([
                    fetch(`${API_URL}/leaderboard/${serverId}?limit=100`),
                    fetch(`${API_URL}/get-server-details/${serverId}`),
                ]);

                if (!leaderboardRes.ok || !serverInfoRes.ok) {
                    throw new Error("Impossible de récupérer les données du serveur ou du classement.");
                }

                const leaderboardData = await leaderboardRes.json();
                const serverInfoData = await serverInfoRes.json();
                
                setLeaderboard(leaderboardData);
                setServerInfo(serverInfoData);
            } catch (err: any) {
                setError(err.message || "Une erreur inconnue est survenue.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [serverId]);

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground">
            <AppHeader />
            <main className="container mx-auto px-4 py-24 sm:py-32">
                <PageTransitionWrapper>
                    <Card className="max-w-4xl mx-auto">
                        <CardHeader className="text-center">
                            {loading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Skeleton className="h-16 w-16 rounded-full"/>
                                    <Skeleton className="h-8 w-64"/>
                                </div>
                            ) : serverInfo ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={serverInfo.icon || ''} alt={serverInfo.name} />
                                        <AvatarFallback>{serverInfo.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <CardTitle className="text-4xl font-bold flex items-center gap-2">
                                        <Trophy/> Classement de {serverInfo.name}
                                    </CardTitle>
                                </div>
                            ) : null}
                            <CardDescription>Top 100 des membres les plus actifs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <LeaderboardSkeleton />
                            ) : error ? (
                                 <div className="flex flex-col items-center gap-4 text-center text-destructive py-10">
                                    <ServerCrash className="h-12 w-12" />
                                    <p className="text-xl font-semibold">Erreur de chargement</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16 text-center">Rang</TableHead>
                                            <TableHead>Utilisateur</TableHead>
                                            <TableHead className="text-center">Niveau</TableHead>
                                            <TableHead className="w-[200px]">Progression</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboard.map((entry) => {
                                            const nameToDisplay = hasSpecialChars(entry.user.displayName) ? entry.user.username : entry.user.displayName;
                                            return (
                                                <TableRow key={entry.user.id}>
                                                    <TableCell className="text-center font-bold text-lg">
                                                        <span className={getRankColor(entry.rank)}>
                                                            {entry.rank === 1 ? <Crown/> : entry.rank}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={entry.user.avatar || ''} alt={entry.user.username} />
                                                                <AvatarFallback>{entry.user.username.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{nameToDisplay}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-lg">{entry.level}</TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Progress value={(entry.xp / entry.requiredXp) * 100} className="h-2"/>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{entry.xp} / {entry.requiredXp} XP</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}
