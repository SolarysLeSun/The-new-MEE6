
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, PlusCircle, Trash2 } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface InvitationReward {
    invite_count: number;
    role_id: string;
}

interface InvitationsConfig {
    enabled: boolean;
    log_channel_id: string | null;
    reward_roles: InvitationReward[];
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
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function InvitationsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<InvitationsConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!serverId) return;
        setLoading(true);
        try {
            const [configRes, serverDetailsRes] = await Promise.all([
                fetch(`${API_URL}/get-config/${serverId}/invitations`),
                fetch(`${API_URL}/get-server-details/${serverId}`)
            ]);
            if (!configRes.ok || !serverDetailsRes.ok) throw new Error("Impossible de récupérer les données.");
            const configData = await configRes.json();
            const serverDetailsData = await serverDetailsRes.json();
            setConfig(configData);
            setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
            setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [serverId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveConfig = async (newConfig: InvitationsConfig) => {
        setConfig(newConfig);
        try {
            await fetch(`${API_URL}/update-config/${serverId}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof InvitationsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };
    
    if (loading || !config) {
        return <PageSkeleton />;
    }

    const textChannelOptions = [
        { value: 'none', label: 'Désactivé' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];

    const roleOptions = roles.map(r => ({ value: r.id, label: `@${r.name}` }));

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Mail /> Invitations</h1>
                <p className="text-muted-foreground mt-2">
                    Suivez qui invite de nouveaux membres et récompensez les meilleurs recruteurs.
                </p>
            </div>
            
            <Separator />
            
            <Card>
                <CardHeader>
                    <CardTitle>Suivi des Invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="enable-module" className="font-bold">Activer le suivi des invitations</Label>
                            <p className="text-sm text-muted-foreground/80">Active ou désactive ce module.</p>
                        </div>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                        <div>
                            <Label htmlFor="log-channel" className="font-bold text-sm uppercase text-muted-foreground">Salon de logs</Label>
                            <p className="text-sm text-muted-foreground/80">
                                Le salon où les informations sur les invitations seront enregistrées.
                            </p>
                        </div>
                        <Combobox
                            options={textChannelOptions}
                            value={config.log_channel_id || 'none'}
                            onChange={(value) => handleValueChange('log_channel_id', value === 'none' ? null : value)}
                            placeholder="Sélectionner un salon"
                            searchPlaceholder="Rechercher un salon..."
                            emptyPlaceholder="Aucun salon trouvé."
                            className="w-full md:w-[280px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="opacity-50 pointer-events-none">
                <CardHeader>
                    <CardTitle>Rôles de Récompense (Bientôt)</CardTitle>
                    <CardDescription>
                        Attribuez automatiquement des rôles lorsque les membres atteignent un certain nombre d'invitations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 p-4 border rounded-lg bg-card-foreground/5">
                        <div className="w-full sm:w-32">
                            <Label className="text-xs">Invitations</Label>
                            <Input type="number" placeholder="Ex: 5" value="5" disabled/>
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">Rôle à donner</Label>
                            <Combobox options={roleOptions} value="" onChange={() => {}} placeholder="Sélectionner un rôle..." disabled />
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0" disabled><Trash2 className="text-destructive"/></Button>
                    </div>
                    <Button variant="outline" className="w-full" disabled><PlusCircle /> Ajouter une récompense</Button>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
