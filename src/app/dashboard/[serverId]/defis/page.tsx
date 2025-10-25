
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface ChallengesConfig {
    enabled: boolean;
    channel_id: string | null;
    mention_role_id: string | null;
}

interface DiscordChannel { id: string; name: string; type: number; }
interface DiscordRole { id: string; name: string; }

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

export default function ChallengesPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<ChallengesConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/challenges`),
                    fetch(`${API_URL}/get-server-details/${serverId}`),
                ]);
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

    const saveConfig = async (newConfig: ChallengesConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/challenges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }
    
    const channelOptions = [{ value: 'none', label: 'Ne pas annoncer' }, ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))];
    const roleOptions = [{ value: 'none', label: 'Ne pas mentionner' }, ...roles.map(r => ({ value: r.id, label: `@${r.name}` }))];

    return (
        <PageTransitionWrapper className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Trophy /> Défis Quotidiens</h1>
                <p className="text-muted-foreground mt-2">
                    Motivez votre communauté avec des défis journaliers générés par l'IA et récompensés en XP.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="enable-challenges" className="font-bold">Activer les défis quotidiens</Label>
                            <p className="text-sm text-muted-foreground">Chaque jour à minuit, 5 nouveaux défis seront générés.</p>
                        </div>
                        <Switch id="enable-challenges" checked={config.enabled} onCheckedChange={(val) => saveConfig({...config, enabled: val})} />
                    </div>
                    <Separator/>
                     <div className="space-y-2">
                        <Label>Salon d'annonce des défis</Label>
                        <Combobox
                            options={channelOptions}
                            value={config.channel_id || 'none'}
                            onChange={(value) => saveConfig({...config, channel_id: value === 'none' ? null : value})}
                            placeholder="Sélectionner un salon..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Rôle à mentionner dans l'annonce</Label>
                        <Combobox
                            options={roleOptions}
                            value={config.mention_role_id || 'none'}
                            onChange={(value) => saveConfig({...config, mention_role_id: value === 'none' ? null : value})}
                            placeholder="Sélectionner un rôle..."
                        />
                    </div>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
