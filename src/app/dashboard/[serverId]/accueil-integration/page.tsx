'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Voicemail } from 'lucide-react';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface WelcomeConfig {
    enabled: boolean;
    welcome_channel_id: string | null;
    welcome_message: string;
}

interface AutorolesConfig {
    enabled: boolean;
    on_join_roles: string[];
    on_voice_join_roles: string[];
}

interface DiscordChannel { id: string; name: string; type: number; }
interface DiscordRole { id: string; name: string; }

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
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function WelcomePage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [welcomeConfig, setWelcomeConfig] = useState<WelcomeConfig | null>(null);
    const [autorolesConfig, setAutorolesConfig] = useState<AutorolesConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [welcomeRes, autorolesRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/welcome-message`),
                    fetch(`${API_URL}/get-config/${serverId}/autoroles`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                const welcomeData = await welcomeRes.json();
                const autorolesData = await autorolesRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setWelcomeConfig(welcomeData);
                setAutorolesConfig(autorolesData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
                setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));

            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger les configurations.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveWelcomeConfig = async (newConfig: WelcomeConfig) => {
        setWelcomeConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/welcome-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const saveAutorolesConfig = async (newConfig: AutorolesConfig) => {
        setAutorolesConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/autoroles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleWelcomeChange = (key: keyof WelcomeConfig, value: any) => {
        if (!welcomeConfig) return;
        saveWelcomeConfig({ ...welcomeConfig, [key]: value });
    };
    
    const handleAutorolesChange = (key: keyof AutorolesConfig, value: any) => {
        if (!autorolesConfig) return;
        saveAutorolesConfig({ ...autorolesConfig, [key]: value });
    };
    
    if (loading || !welcomeConfig || !autorolesConfig) {
        return <PageSkeleton />;
    }

    const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

    return (
        <PageTransitionWrapper className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold">Accueil &amp; Intégration</h1>
                <p className="text-muted-foreground mt-2">
                Configurez une expérience d'arrivée fluide pour vos nouveaux membres.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Message de Bienvenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enable-welcome" className="font-bold">Activer le message de bienvenue</Label>
                        <Switch id="enable-welcome" checked={welcomeConfig.enabled} onCheckedChange={(val) => handleWelcomeChange('enabled', val)} />
                    </div>
                    <Separator />
                    <div>
                        <Label htmlFor="welcome-channel">Salon de bienvenue</Label>
                        <Select value={welcomeConfig.welcome_channel_id || 'none'} onValueChange={(val) => handleWelcomeChange('welcome_channel_id', val === 'none' ? null : val)}>
                            <SelectTrigger id="welcome-channel">
                                <SelectValue placeholder="Sélectionner un salon" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Désactivé</SelectItem>
                                {channels.map(channel => (
                                    <SelectItem key={channel.id} value={channel.id}># {channel.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="welcome-message">Message de bienvenue</Label>
                        <p className="text-sm text-muted-foreground">Utilisez {"{user}"} pour mentionner le nouveau membre.</p>
                        <Textarea id="welcome-message" defaultValue={welcomeConfig.welcome_message} onBlur={(e) => handleWelcomeChange('welcome_message', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex items-center justify-between">
                         <CardTitle>Rôles Automatiques</CardTitle>
                        <Switch id="enable-autoroles" checked={autorolesConfig.enabled} onCheckedChange={(val) => handleAutorolesChange('enabled', val)} />
                    </div>
                     <CardDescription>Attribuez automatiquement des rôles à l'arrivée ou lors de la connexion en vocal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="join-roles" className="font-bold">Rôles à l'arrivée</Label>
                         <p className="text-sm text-muted-foreground">Rôles à attribuer quand un membre rejoint le serveur.</p>
                        <MultiSelectCombobox
                            options={roleOptions}
                            selected={autorolesConfig.on_join_roles || []}
                            onSelectedChange={(selected) => handleAutorolesChange('on_join_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                    <Separator/>
                     <div className="space-y-2">
                        <Label htmlFor="voice-roles" className="font-bold flex items-center gap-2"><Voicemail/>Rôles en vocal</Label>
                        <p className="text-sm text-muted-foreground">Rôles attribués quand un membre rejoint un salon vocal, et retirés quand il quitte.</p>
                        <MultiSelectCombobox
                            options={roleOptions}
                            selected={autorolesConfig.on_voice_join_roles || []}
                            onSelectedChange={(selected) => handleAutorolesChange('on_voice_join_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
