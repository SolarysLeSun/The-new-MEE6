
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Grid, Sparkles, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import type { VoiceHubsConfig, VoiceHub } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    parentId?: string;
}

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
            <Card><CardHeader><Skeleton className="h-48 w-full" /></CardHeader></Card>
        </div>
    );
}

export default function VoiceHubsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<VoiceHubsConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConfigData = useCallback(async () => {
        if (!serverId) return;
        setLoading(true);
        try {
            const [configRes, serverDetailsRes] = await Promise.all([
                fetch(`${API_URL}/get-config/${serverId}/voice-hubs`),
                fetch(`${API_URL}/get-server-details/${serverId}`),
            ]);
            if (!configRes.ok || !serverDetailsRes.ok) throw new Error("Impossible de récupérer les données.");
            
            const configData = await configRes.json();
            const serverDetailsData = await serverDetailsRes.json();

            setConfig(configData);
            setChannels(serverDetailsData.channels);
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [serverId, toast]);

    useEffect(() => {
        fetchConfigData();
    }, [fetchConfigData]);

    const saveConfig = async (newConfig: VoiceHubsConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/voice-hubs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof VoiceHubsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handleAddHub = () => {
        if (!config) return;
        const newHub: VoiceHub = {
            id: uuidv4(),
            creator_channel_id: '',
            name_format: 'Salon de {user}',
            user_limit: 0,
            enable_smart_voice: false,
        };
        saveConfig({ ...config, hubs: [...(config.hubs || []), newHub] });
    };

    const handleUpdateHub = (updatedHub: VoiceHub) => {
        if (!config) return;
        const newHubs = config.hubs.map(hub => hub.id === updatedHub.id ? updatedHub : hub);
        saveConfig({ ...config, hubs: newHubs });
    };

    const handleDeleteHub = (hubId: string) => {
        if (!config) return;
        saveConfig({ ...config, hubs: config.hubs.filter(hub => hub.id !== hubId) });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const categoryOptions = [
        { value: 'none', label: 'Aucune' },
        ...channels.filter(c => c.type === 4).map(c => ({ value: c.id, label: c.name }))
    ];
    
    const hubCreatorChannels = channels.filter(c => c.type === 2 && c.parentId === config.hub_category_id);

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Grid /> Hubs Vocaux
                </h1>
                <p className="text-muted-foreground mt-2">
                    Créez des salons vocaux temporaires à la demande pour votre communauté.
                </p>
            </div>
            
            <Separator />
            
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Comment ça marche ?</AlertTitle>
                <AlertDescription>
                   <ol className="list-decimal list-inside space-y-1">
                        <li>Choisissez une catégorie "A" pour vos salons de création (les hubs) et une catégorie "B" où les salons temporaires apparaîtront.</li>
                        <li>Créez des salons vocaux dans votre catégorie "A" sur Discord.</li>
                        <li>Configurez ces salons comme des "hubs" ci-dessous.</li>
                        <li>Lorsqu'un utilisateur rejoint un hub, un salon temporaire est créé pour lui dans la catégorie "B" et il y est déplacé.</li>
                   </ol>
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration Générale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Catégorie des Hubs (A)</Label>
                            <Combobox options={categoryOptions} value={config.hub_category_id || 'none'} onChange={(val) => handleValueChange('hub_category_id', val === 'none' ? null : val)} placeholder="Catégorie des salons créateurs" />
                        </div>
                        <div className="space-y-2">
                            <Label>Catégorie de Destination (B)</Label>
                            <Combobox options={categoryOptions} value={config.dest_category_id || 'none'} onChange={(val) => handleValueChange('dest_category_id', val === 'none' ? null : val)} placeholder="Catégorie des salons créés" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Configuration des Hubs</h2>
                    <Button onClick={handleAddHub}>
                        <PlusCircle className="mr-2"/> Créer un Hub
                    </Button>
                </div>

                {config.hubs.length === 0 ? (
                     <Card className="text-center py-12 border-2 border-dashed">
                        <Grid className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun hub configuré</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Créez un salon vocal dans votre catégorie "A" puis cliquez sur "Créer un Hub".
                        </p>
                    </Card>
                ) : config.hubs.map((hub, index) => (
                    <Card key={hub.id} className="bg-card/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                           <CardTitle>Hub {index + 1}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteHub(hub.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <Label>Salon Vocal Créateur (dans Catégorie A)</Label>
                                    <Combobox 
                                        options={hubCreatorChannels.map(c => ({ value: c.id, label: c.name }))}
                                        value={hub.creator_channel_id || ''}
                                        onChange={(val) => handleUpdateHub({...hub, creator_channel_id: val})}
                                        placeholder="Choisir un salon vocal..."
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Format du Nom du Salon Temporaire</Label>
                                    <Input
                                        defaultValue={hub.name_format}
                                        onBlur={(e) => handleUpdateHub({...hub, name_format: e.target.value})}
                                        placeholder="Salon de {user}"
                                    />
                                     <p className="text-xs text-muted-foreground">Variables: {'{user}'}, {'{activite}'}, {'{mb.connect}'}</p>
                                </div>
                            </div>
                             <div className="grid md:grid-cols-2 gap-4 items-center">
                                 <div className="space-y-2">
                                    <Label>Limite d'utilisateurs (0 = infini)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={hub.user_limit}
                                        onBlur={(e) => handleUpdateHub({...hub, user_limit: parseInt(e.target.value, 10) || 0})}
                                        className="w-24"
                                    />
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <Switch
                                        id={`smart-voice-${hub.id}`}
                                        checked={hub.enable_smart_voice}
                                        onCheckedChange={(val) => handleUpdateHub({...hub, enable_smart_voice: val})}
                                    />
                                    <Label htmlFor={`smart-voice-${hub.id}`} className="flex items-center gap-2">
                                        <Sparkles className="text-yellow-400"/> Activer l'IA Vocaux
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageTransitionWrapper>
    );
}

if (typeof window !== 'undefined') {
    (window as any).uuidv4 = uuidv4;
}
