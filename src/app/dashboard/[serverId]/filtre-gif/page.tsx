
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { FileVideo } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface GifFilterConfig {
    enabled: boolean;
    exempt_roles: string[];
    exempt_channels: string[];
}
interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}
interface DiscordRole {
  id: string;
  name: string;
}

function PageSkeleton() {
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

export default function GifFilterPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<GifFilterConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/gif-filter`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setChannels(serverDetailsData.channels);
                setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: GifFilterConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/gif-filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof GifFilterConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }
    
    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <FileVideo /> Filtre Anti-GIF
                </h1>
                <p className="text-muted-foreground mt-2">
                    Supprimez automatiquement les GIFs envoyés par les membres.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Configuration du Filtre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="enable-module" className="font-bold">Activer le filtre anti-GIF</Label>
                             <p className="text-sm text-muted-foreground/80">Si activé, les messages contenant un lien Tenor seront supprimés.</p>
                        </div>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator/>
                    <div className="space-y-2">
                        <Label htmlFor="exempt-roles" className="font-bold text-sm uppercase text-muted-foreground">Rôles exemptés</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Les GIFs envoyés par les utilisateurs avec ces rôles ne seront pas supprimés.
                        </p>
                         <MultiSelectCombobox
                            options={roles.map(r => ({ value: r.id, label: r.name }))}
                            selected={config.exempt_roles || []}
                            onSelectedChange={(selected) => handleValueChange('exempt_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                    <Separator/>
                    <div className="space-y-2">
                        <Label htmlFor="exempt-channels" className="font-bold text-sm uppercase text-muted-foreground">Salons exemptés</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Les GIFs seront autorisés dans ces salons.
                        </p>
                        <MultiSelectCombobox
                            options={channels.filter(c => c.type === 0).map(c => ({ value: c.id, label: `# ${c.name}` }))}
                            selected={config.exempt_channels || []}
                            onSelectedChange={(selected) => handleValueChange('exempt_channels', selected)}
                            placeholder="Sélectionner des salons..."
                        />
                    </div>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    )
}
