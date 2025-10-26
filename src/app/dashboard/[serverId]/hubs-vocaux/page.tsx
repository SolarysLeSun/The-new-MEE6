
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
import { PlusCircle, Trash2, Grid, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
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
    const [isCreating, setIsCreating] = useState(false);

    const fetchAllData = useCallback(async () => {
        if (!serverId) return;
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
        }
    }, [serverId, toast]);

    useEffect(() => {
        setLoading(true);
        fetchAllData().finally(() => setLoading(false));
    }, [fetchAllData]);

    const saveConfig = useCallback(async (newConfig: VoiceHubsConfig): Promise<boolean> => {
        setConfig(newConfig); // Optimistic update
        try {
            const response = await fetch(`${API_URL}/update-config/${serverId}/voice-hubs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
            if (!response.ok) throw new Error("La sauvegarde a échoué");
            return true;
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
            fetchAllData(); // Re-fetch to revert optimistic update on error
            return false;
        }
    }, [serverId, toast, fetchAllData]);

    const handleValueChange = (key: keyof VoiceHubsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handleAddHub = async () => {
        if (!config || !config.hub_category_id) {
            toast({ title: "Action impossible", description: "Veuillez d'abord sélectionner une 'Catégorie des Hubs (A)'.", variant: "destructive" });
            return;
        }
        setIsCreating(true);
        try {
            const response = await fetch(`${API_URL}/voice-hubs/create-channel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId: serverId, categoryId: config.hub_category_id, name: 'Nouveau Hub' })
            });
            if (!response.ok) throw new Error("La création du salon a échoué.");

            const newChannel: { id: string; name: string } = await response.json();
            
            const newHub: VoiceHub = {
                id: uuidv4(),
                creator_channel_id: newChannel.id,
                name_format: 'Salon de {user}',
                user_limit: 0,
                enable_smart_voice: false,
            };

            const success = await saveConfig({ ...config, hubs: [...(config.hubs || []), newHub] });
            if (success) {
                toast({ title: "Succès", description: `Le hub vocal "${newChannel.name}" a été créé sur Discord.`});
                await fetchAllData(); // Force refresh to get all new data
            }

        } catch (error) {
            toast({ title: "Erreur lors de la création", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateHub = async (updatedHub: VoiceHub) => {
        if (!config) return;
        const newHubs = config.hubs.map(hub => hub.id === updatedHub.id ? updatedHub : hub);
        await saveConfig({ ...config, hubs: newHubs });
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
                        <li>Cliquez sur "Créer un Hub". Cela créera un salon vocal dans votre catégorie "A" sur Discord.</li>
                        <li>Configurez chaque hub : renommez-le, définissez le format des salons temporaires, la limite de membres, etc.</li>
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
                     <div className="space-y-2">
                        <Label>Salon des logs</Label>
                        <p className="text-sm text-muted-foreground/80">Un message sera envoyé dans ce salon lors de la création d'un salon temporaire.</p>
                        <Combobox 
                            options={channels.filter(c => c.type === 0).map(c => ({ value: c.id, label: `# ${c.name}` }))} 
                            value={config.log_channel_id || 'none'} 
                            onChange={(val) => handleValueChange('log_channel_id', val === 'none' ? null : val)} 
                            placeholder="Aucun" />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Configuration des Hubs</h2>
                    <Button onClick={handleAddHub} disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 animate-spin"/> : <PlusCircle className="mr-2"/>} Créer un Hub
                    </Button>
                </div>

                {config.hubs.length === 0 ? (
                     <Card className="text-center py-12 border-2 border-dashed">
                        <Grid className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun hub configuré</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Cliquez sur "Créer un Hub" pour commencer.
                        </p>
                    </Card>
                ) : config.hubs.map((hub, index) => (
                    <HubConfigCard
                        key={hub.id}
                        hub={hub}
                        channels={channels}
                        onUpdate={handleUpdateHub}
                        onDelete={() => handleDeleteHub(hub.id)}
                        serverId={serverId}
                        toast={toast}
                    />
                ))}
            </div>
        </PageTransitionWrapper>
    );
}

interface HubConfigCardProps {
    hub: VoiceHub;
    channels: DiscordChannel[];
    onUpdate: (hub: VoiceHub) => void;
    onDelete: () => void;
    serverId: string;
    toast: any;
}

function HubConfigCard({ hub, channels, onUpdate, onDelete, serverId, toast }: HubConfigCardProps) {
    const hubChannel = channels.find(c => c.id === hub.creator_channel_id);
    const [name, setName] = useState(hubChannel?.name || "Hub en chargement...");
    
    useEffect(() => {
        if(hubChannel) setName(hubChannel.name);
    }, [hubChannel]);

    const handleNameBlur = async () => {
        if (name !== hubChannel?.name) {
            try {
                await fetch(`${API_URL}/voice-hubs/rename-channel`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guildId: serverId, channelId: hub.creator_channel_id, name })
                });
                toast({title: 'Succès', description: 'Le hub a été renommé.'});
            } catch (error) {
                toast({ title: "Erreur de renommage", variant: "destructive" });
            }
        }
    };
    
    return (
        <Card className="bg-card/50">
            <CardHeader className="flex-row items-center justify-between">
               <CardTitle>
                 <Input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                 />
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive"/></Button>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Format du Nom du Salon Temporaire</Label>
                    <Input
                        defaultValue={hub.name_format}
                        onBlur={(e) => onUpdate({...hub, name_format: e.target.value})}
                        placeholder="Salon de {user}"
                    />
                    <p className="text-xs text-muted-foreground">Variables: {'{user}'}, {'{activite}'}, {'{mb.connect}'}</p>
                </div>
                 <div className="grid md:grid-cols-2 gap-4 items-center">
                     <div className="space-y-2">
                        <Label>Limite d'utilisateurs (0 = infini)</Label>
                        <Input
                            type="number"
                            defaultValue={hub.user_limit}
                            onBlur={(e) => onUpdate({...hub, user_limit: parseInt(e.target.value, 10) || 0})}
                            className="w-24"
                        />
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch
                            id={`smart-voice-${hub.id}`}
                            checked={hub.enable_smart_voice}
                            onCheckedChange={(val) => onUpdate({...hub, enable_smart_voice: val})}
                        />
                        <Label htmlFor={`smart-voice-${hub.id}`} className="flex items-center gap-2">
                            <Sparkles className="text-yellow-400"/> Activer l'IA Vocaux
                        </Label>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


if (typeof window !== 'undefined') {
    (window as any).uuidv4 = uuidv4;
}
