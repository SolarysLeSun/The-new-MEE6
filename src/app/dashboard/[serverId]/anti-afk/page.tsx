
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { UserX } from 'lucide-react';
import type { AntiAfkConfig } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

function AntiAfkPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Separator />
      <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
    </div>
  )
}

export default function AntiAfkPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<AntiAfkConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/anti-afk`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 2)); // Voice channels
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: AntiAfkConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/anti-afk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof AntiAfkConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <AntiAfkPageSkeleton />;
    }

    const channelOptions = [
        { value: 'none', label: 'Aucun' },
        ...channels.map(c => ({ value: c.id, label: `🔊 ${c.name}` }))
    ];
    
    return (
    <PageTransitionWrapper className="space-y-8 max-w-4xl">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <UserX/> Anti-AFK
            </h1>
            <p className="text-muted-foreground mt-2">
                Gérez automatiquement les membres inactifs dans les salons vocaux.
            </p>
        </div>
      
        <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Configuration de l'Anti-AFK</CardTitle>
                    <CardDescription>
                        Déplacez automatiquement les membres muets ou sourds après un certain temps.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                        </div>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator/>
                    <div className="space-y-2">
                        <Label htmlFor="afk-channel" className="font-bold text-sm uppercase text-muted-foreground">Salon AFK</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Le salon vocal où les membres inactifs seront déplacés.
                        </p>
                        <Combobox
                            options={channelOptions}
                            value={config.afk_channel_id || 'none'}
                            onChange={(value) => handleValueChange('afk_channel_id', value === 'none' ? null : value)}
                            placeholder="Sélectionner un salon vocal"
                            searchPlaceholder="Rechercher un salon..."
                            emptyPlaceholder="Aucun salon vocal trouvé."
                            className="w-full md:w-[280px]"
                        />
                    </div>
                    <Separator/>
                    <div className="space-y-2">
                        <Label htmlFor="timeout-minutes">Délai d'inactivité (minutes)</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Temps qu'un membre doit passer en sourdine (serveur) avant d'être considéré comme AFK.
                        </p>
                        <Input 
                            id="timeout-minutes" 
                            type="number" 
                            value={config.timeout_minutes}
                            onChange={(e) => handleValueChange('timeout_minutes', parseInt(e.target.value) || 15)}
                            className="w-24"
                        />
                    </div>
                </CardContent>
            </Card>
    </PageTransitionWrapper>
    )
}
