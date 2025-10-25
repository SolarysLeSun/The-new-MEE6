

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Wrench, BarChart2, Users, MessageSquare, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface ActivityStat {
    timestamp: string;
    message_count: number;
    voice_member_count: number;
}
interface RatiosData {
    activeMemberPercentage: number;
    joinLeaveRatio: {
        joins: number;
        leaves: number;
    };
}


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Heure
            </span>
            <span className="font-bold text-muted-foreground">
              {format(new Date(label), "HH:mm", { locale: fr })}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
             <span className="text-[0.70rem] uppercase text-muted-foreground">
              Date
            </span>
             <span className="font-bold">
               {format(new Date(label), "d MMM", { locale: fr })}
            </span>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
                <span className="flex items-center text-xs text-muted-foreground"><MessageSquare className="w-4 h-4 mr-2" style={{color: "hsl(var(--primary))"}}/>Messages</span>
                <span className="font-semibold">{payload[0].value}</span>
            </div>
             <div className="flex items-center justify-between">
                <span className="flex items-center text-xs text-muted-foreground"><Users className="w-4 h-4 mr-2" style={{color: "#3498db"}}/>En vocal</span>
                <span className="font-semibold">{payload[1].value}</span>
            </div>
        </div>
      </div>
    );
  }

  return null;
};


function CommunityAnalysisContent({ isPremium }: { isPremium: boolean }) {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();
    const [activityData, setActivityData] = useState<ActivityStat[]>([]);
    const [ratiosData, setRatiosData] = useState<RatiosData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId || !isPremium) return;
        const fetchData = async () => {
            try {
                const [activityRes, ratiosRes] = await Promise.all([
                    fetch(`${API_URL}/activity-stats/${serverId}`),
                    fetch(`${API_URL}/community-ratios/${serverId}`)
                ]);
                if (!activityRes.ok) throw new Error("Impossible de récupérer les statistiques d'activité.");
                if (!ratiosRes.ok) throw new Error("Impossible de récupérer les ratios communautaires.");

                const activityData = await activityRes.json();
                const ratiosData = await ratiosRes.json();
                setActivityData(activityData);
                setRatiosData(ratiosData);

            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [serverId, isPremium, toast]);
    
    const formattedData = useMemo(() => {
        return activityData.map(stat => ({
            ...stat,
            time: new Date(stat.timestamp).getTime(),
        }));
    }, [activityData]);

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper className="space-y-8">
                <Alert>
                    <Wrench className="h-4 w-4" />
                    <AlertTitle>Données en cours de collecte</AlertTitle>
                    <AlertDescription>
                    Ce module vient d'être activé. Les données d'activité de votre serveur sont en cours de collecte et apparaîtront progressivement. Les graphiques et ratios seront complets après 24h.
                    </AlertDescription>
                </Alert>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users /> Ratios Clés (24h)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? <Skeleton className="h-16 w-full"/> : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Taux de membres actifs</span>
                                        <span className="font-bold text-2xl text-primary">{ratiosData?.activeMemberPercentage.toFixed(1) ?? '--'}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Ratio arrivées / départs</span>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-lg text-green-400 flex items-center gap-1"><ArrowUp/>{ratiosData?.joinLeaveRatio.joins ?? '--'}</span>
                                            <span className="font-bold text-lg text-red-400 flex items-center gap-1"><ArrowDown/>{ratiosData?.joinLeaveRatio.leaves ?? '--'}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="opacity-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><MessageSquare /> Top Salons (24h)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-muted-foreground">
                             <p># ...</p>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle>Activité sur les dernières 24 heures</CardTitle>
                        <CardDescription>Aperçu du volume de messages et de l'activité vocale.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] w-full">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-primary w-8 h-8"/>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedData}>
                                    <defs>
                                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorVocal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis 
                                        dataKey="time"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(time) => format(new Date(time), 'HH:mm')}
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                    />
                                    <YAxis 
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="message_count" name="Messages" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMessages)" />
                                    <Area type="monotone" dataKey="voice_member_count" name="Membres en vocal" stroke="#3498db" fillOpacity={1} fill="url(#colorVocal)" />
                                </AreaChart>
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

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Analyse de Communauté
          <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualisez l'activité de votre serveur pour mieux comprendre votre communauté.
        </p>
      </div>
      
      <Separator />

      {loading ? (
        <Skeleton className="w-full h-96"/>
      ) : (
        <CommunityAnalysisContent isPremium={serverInfo?.isPremium || false}/>
      )}

    </PageTransitionWrapper>
  );
}
