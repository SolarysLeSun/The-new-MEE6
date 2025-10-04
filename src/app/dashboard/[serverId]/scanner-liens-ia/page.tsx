

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';
import { useServerInfo } from '@/hooks/use-server-info';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { Badge } from '@/components/ui/badge';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { Combobox } from '@/components/ui/combobox';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface LinkScannerConfig {
    enabled: boolean;
    action: 'warn' | 'delete';
    alert_channel_id: string | null;
    exempt_roles: string[];
    allow_nsfw_links: boolean;
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


function LinkScannerPageContent({ isPremium }: { isPremium: boolean }) {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<LinkScannerConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/link-scanner`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
                 setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: LinkScannerConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/link-scanner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof LinkScannerConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <Skeleton className="h-96 w-full" />;
    }

    const channelOptions = [
        { value: 'none', label: 'Aucun' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];
    
    return (
    <PremiumFeatureWrapper isPremium={isPremium}>
        <PageTransitionWrapper className="space-y-8">
            <GlobalAiStatusAlert />
            <Card>
                <CardHeader>
                    <CardTitle>Configuration du Scanner de Liens</CardTitle>
                    <CardDescription>
                        Analyse les liens envoyés sur le serveur pour détecter les arnaques et le contenu indésirable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="link-scanner" className="font-bold">Activer le scanner de liens</Label>
                        </div>
                        <Switch id="link-scanner" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="alert-channel" className="font-bold text-sm uppercase text-muted-foreground">Salon d'alertes</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Le salon où envoyer les notifications de liens suspects.
                        </p>
                        <Combobox
                            options={channelOptions}
                            value={config.alert_channel_id || 'none'}
                            onChange={(value) => handleValueChange('alert_channel_id', value === 'none' ? null : value)}
                            placeholder="Sélectionner un salon"
                            searchPlaceholder="Rechercher un salon..."
                            emptyPlaceholder="Aucun salon trouvé."
                            className="w-full md:w-[280px]"
                        />
                    </div>
                    <Separator/>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                        <div>
                            <Label htmlFor="link-action" className="font-bold text-sm uppercase text-muted-foreground">Action sur lien suspect</Label>
                        </div>
                        <Select value={config.action} onValueChange={(val) => handleValueChange('action', val)}>
                            <SelectTrigger id="link-action" className="w-full md:w-[240px]">
                                <SelectValue placeholder="Sélectionner une action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="warn">Avertir dans le salon d'alertes</SelectItem>
                                <SelectItem value="delete">Supprimer le message</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                        <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="allow-nsfw" className="font-bold text-sm uppercase text-muted-foreground">Autoriser les liens +18</Label>
                            <p className="text-sm text-muted-foreground/80">
                                Si désactivé, les liens menant à du contenu pour adultes seront supprimés.
                            </p>
                        </div>
                        <Switch id="allow-nsfw" checked={config.allow_nsfw_links} onCheckedChange={(val) => handleValueChange('allow_nsfw_links', val)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="exempt-roles" className="font-bold text-sm uppercase text-muted-foreground">Rôles exemptés du scan</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Les liens envoyés par les utilisateurs avec ces rôles ne seront pas supprimés/signalés.
                        </p>
                         <MultiSelectCombobox
                            options={roles.map(r => ({ value: r.id, label: r.name }))}
                            selected={config.exempt_roles || []}
                            onSelectedChange={(selected) => handleValueChange('exempt_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    </PremiumFeatureWrapper>
    )
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

export default function LinkScannerPage() {
  const { serverInfo, loading } = useServerInfo();
  
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Scanner de Liens IA
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
            Protégez votre communauté des liens malveillants et du contenu indésirable grâce à l'IA.
        </p>
      </div>
      
      <Separator />

      {loading ? (
        <PageSkeleton />
      ) : (
        <LinkScannerPageContent isPremium={serverInfo?.isPremium || false} />
      )}
    </PageTransitionWrapper>
  );
}
