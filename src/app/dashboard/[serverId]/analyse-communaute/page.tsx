

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AreaChart, Loader2, ServerCrash, Users, MessagesSquare, Ratio, Activity, UserMinus, UserPlus, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface AnalysisConfig {
    enabled: boolean;
    premium: boolean;
}

interface ActivityStat {
    timestamp_bucket: string;
    message_count: number;
    active_voice_members_count: number;
    cumulative_voice_minutes: number;
    active_text_members_count: number;
}

interface JoinLeaveStat {
    joins: number;
    leaves: number;
}


function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
    );
}

function RatioCard({ title, value, description, icon: Icon, change }: { title: string, value: string, description: string, icon: React.ElementType, change?: {value: number, label: string} }) {
    return (
        <Card className="bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{description}</p>
                    {change && (
                        <div className={`flex items-center text-xs font-semibold ${change.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {change.value >= 0 ? <TrendingUp className="h-3 w-3 mr-1"/> : <TrendingDown className="h-3 w-3 mr-1"/>}
                            {change.value > 0 && '+'}{change.value} ({change.label})
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function CommunityAnalysisContent({ serverInfo, isPremium, serverId }: { serverInfo: any, isPremium: boolean, serverId: string }) {
    const { toast } = useToast();
    const [config, setConfig] = useState<AnalysisConfig | null>(null);
    const [activityData, setActivityData] = useState<ActivityStat[]>([]);
    const [joinLeaveData, setJoinLeaveData] = useState<JoinLeaveStat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [intervalMinutes, setIntervalMinutes] = useState(30);

    const fetchData = async () => {
        if (!serverId) return;
        setLoading(true);
        setError(null);
        try {
            const [configRes, activityRes, joinLeaveRes] = await Promise.all([
                fetch(`${API_URL}/get-config/${serverId}/community-analysis`),
                fetch(`${API_URL}/get-activity-stats/${serverId}`),
                fetch(`${API_URL}/get-join-leave-stats/${serverId}`),
            ]);
            if (!configRes.ok) throw new Error("Impossible de charger la configuration.");
            const configData = await configRes.json();
            setConfig(configData);

            if (activityRes.ok) {
                const activityData = await activityRes.json();
                setActivityData(activityData);
            } else {
                 setError("Impossible de charger les données d'activité.");
            }
            
            if (joinLeaveRes.ok) {
                const joinLeaveData = await joinLeaveRes.json();
                setJoinLeaveData(joinLeaveData);
            } else {
                console.warn("Could not load join/leave stats.");
            }


        } catch (err: any) {
            setError(err.message);
            toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [serverId]);

    const saveConfig = async (newConfig: AnalysisConfig, showToast = true) => {
        setConfig(newConfig);
        try {
            await fetch(`${API_URL}/update-config/${serverId}/community-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
            if(showToast) {
                 toast({ title: "Configuration sauvegardée" });
            }
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleResetCollection = async () => {
        toast({
            title: 'Réinitialisation en cours...',
            description: 'Forcer la (ré)initialisation de la collecte de données pour ce serveur.'
        });
        try {
            const response = await fetch(`${API_URL}/force-reset-activity-stats/${serverId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'La réinitialisation a échoué.');
            }
            toast({
                title: 'Succès',
                description: 'Les statistiques ont été réinitialisées. Les nouvelles données apparaîtront bientôt.',
            });
            setTimeout(fetchData, 2000); // Re-fetch data after a short delay
        } catch(error: any) {
             toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
    };


    const formattedData = useMemo(() => {
        if (activityData.length === 0) return [];
        
        const aggregatedData: { [key: string]: any } = {};

        activityData.forEach(stat => {
            const date = new Date(stat.timestamp_bucket);
            const bucketKey = Math.floor(date.getTime() / (intervalMinutes * 60 * 1000));
            
            if (!aggregatedData[bucketKey]) {
                aggregatedData[bucketKey] = {
                    timestamp: bucketKey * intervalMinutes * 60 * 1000,
                    Messages: 0,
                    'Utilisateurs en vocal': [],
                    'Minutes en vocal': 0,
                };
            }
            
            aggregatedData[bucketKey].Messages += stat.message_count;
            aggregatedData[bucketKey]['Utilisateurs en vocal'].push(stat.active_voice_members_count);
            aggregatedData[bucketKey]['Minutes en vocal'] += stat.cumulative_voice_minutes;
        });

        return Object.values(aggregatedData).map(bucket => {
            const voiceUsers = bucket['Utilisateurs en vocal'];
            const avgVoiceUsers = voiceUsers.length > 0 ? voiceUsers.reduce((a: number,b: number) => a + b, 0) / voiceUsers.length : 0;
            return {
                time: format(new Date(bucket.timestamp), 'HH:mm'),
                Messages: bucket.Messages,
                'Utilisateurs en vocal': Math.round(avgVoiceUsers),
                'Minutes en vocal': Math.round(bucket['Minutes en vocal']),
            }
        }).sort((a,b) => a.time.localeCompare(b.time));

    }, [activityData, intervalMinutes]);
    
    const engagementRatios = useMemo(() => {
        if (!activityData || activityData.length === 0 || !serverInfo) {
            return { engagement: '0', textVsVoice: '0', msgPerUser: '0', retention: 0, retentionLabel: 'Stable' };
        }
        
        const totalMessages = activityData.reduce((sum, stat) => sum + stat.message_count, 0);
        const totalVoiceMinutes = activityData.reduce((sum, stat) => sum + stat.cumulative_voice_minutes, 0);
        const uniqueTextUsers = new Set(activityData.map(s => s.active_text_members_count).filter(Boolean)).size;
        const uniqueVoiceUsers = new Set(activityData.map(s => s.active_voice_members_count).filter(Boolean)).size;
        
        const totalActiveUsers = Math.max(uniqueTextUsers, uniqueVoiceUsers);

        const retentionValue = joinLeaveData ? joinLeaveData.joins - joinLeaveData.leaves : 0;
        let retentionLabel = 'Stable';
        if (retentionValue > 0) retentionLabel = `+${retentionValue} membres`;
        if (retentionValue < 0) retentionLabel = `${retentionValue} membres`;

        const engagement = serverInfo.memberCount > 0 ? (totalActiveUsers / serverInfo.memberCount) * 100 : 0;
        const textVsVoice = totalVoiceMinutes > 0 ? totalMessages / totalVoiceMinutes : 0;
        const msgPerUser = uniqueTextUsers > 0 ? totalMessages / uniqueTextUsers : 0;

        return {
            engagement: engagement.toFixed(1),
            textVsVoice: textVsVoice.toFixed(2),
            msgPerUser: msgPerUser.toFixed(1),
            retention: retentionValue,
            retentionLabel: retentionLabel,
        }
    }, [activityData, serverInfo, joinLeaveData]);

    if (!config) {
        return <PageSkeleton />;
    }

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper className="space-y-8">
                 <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle>Activation de la Collecte de Données</CardTitle>
                            <Switch checked={config.enabled} onCheckedChange={(val) => saveConfig({...config, enabled: val})} />
                        </div>
                        <CardDescription>
                            Activez ce module pour commencer à enregistrer l'activité de votre serveur. Les données commenceront à apparaître après 5-10 minutes.
                        </CardDescription>
                    </CardHeader>
                </Card>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <RatioCard 
                        title="Taux d'Engagement"
                        value={`${engagementRatios.engagement}%`}
                        description="Membres actifs / Membres totaux sur 24h"
                        icon={Users}
                    />
                     <RatioCard 
                        title="Messages par minute vocale"
                        value={engagementRatios.textVsVoice}
                        description="Ratio messages / minutes en vocal"
                        icon={Ratio}
                    />
                     <RatioCard 
                        title="Activité par membre"
                        value={`${engagementRatios.msgPerUser} msg`}
                        description="Moyenne de messages par membre actif à l'écrit"
                        icon={Activity}
                    />
                    <RatioCard 
                        title="Rétention (24h)"
                        value={engagementRatios.retention > 0 ? `+${engagementRatios.retention}` : `${engagementRatios.retention}`}
                        description="Arrivées - Départs"
                        icon={UserPlus}
                        change={{ value: engagementRatios.retention, label: engagementRatios.retentionLabel }}
                    />
                </div>
                
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <CardTitle>Activité des 24 dernières heures</CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="interval-select">Intervalle</Label>
                                <Select value={String(intervalMinutes)} onValueChange={(val) => setIntervalMinutes(Number(val))}>
                                    <SelectTrigger id="interval-select" className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 min</SelectItem>
                                        <SelectItem value="30">30 min</SelectItem>
                                        <SelectItem value="60">1 heure</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] w-full">
                        {loading ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin"/></div>
                        ) : error ? (
                             <div className="flex flex-col items-center justify-center h-full text-destructive"><ServerCrash className="w-10 h-10 mb-2"/>{error}</div>
                        ) : formattedData.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                                <AreaChart className="w-10 h-10"/>
                                <p>Aucune donnée disponible.</p>
                                <Alert variant="default" className="max-w-md">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Problèmes de Données ?</AlertTitle>
                                    <AlertDescription>
                                        Si le module est activé et que votre serveur est actif mais qu'aucune donnée n'apparaît après 10 minutes, essayez de réinitialiser la collecte.
                                        <Button size="sm" className="mt-2 w-full" onClick={handleResetCollection}>
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                                            Forcer la Réinitialisation
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={formattedData}
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))"/>
                                    <YAxis yAxisId="left" stroke="#8884d8" label={{ value: 'Messages / Membres', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Minutes', angle: -90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}/>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            borderColor: 'hsl(var(--border))',
                                        }}
                                    />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="Messages" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                                    <Line yAxisId="left" type="monotone" dataKey="Utilisateurs en vocal" stroke="#f37349" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="Minutes en vocal" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    );
}

export default function CommunityAnalysisPage() {
  const { serverInfo, loading } = useServerInfo();
  const params = useParams();
  const serverId = params.serverId as string;

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Analyse de Communauté
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualisez l'activité de votre serveur pour identifier les pics d'activité et les périodes creuses.
        </p>
      </div>
      
      <Separator />

      {loading ? (
        <PageSkeleton />
      ) : (
        <CommunityAnalysisContent serverInfo={serverInfo} isPremium={serverInfo?.isPremium || false} serverId={serverId} />
      )}
    </PageTransitionWrapper>
  );
}
