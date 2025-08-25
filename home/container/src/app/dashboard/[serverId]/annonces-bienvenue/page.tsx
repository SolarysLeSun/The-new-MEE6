
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// L'URL de l'API de notre bot
const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types pour nos données (bonne pratique)
interface WelcomeConfig {
    enabled: boolean;
    welcome_channel_id: string | null;
    welcome_message: string;
}
interface DiscordChannel { id: string; name: string; type: number; }

export default function AnnonceBienvenuePage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<WelcomeConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Récupération des données ---
    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                // On récupère la config du module ET les détails du serveur (pour avoir la liste des salons)
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/annonce-bienvenue`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0)); // Garder seulement les salons textuels
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration." });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    // --- Sauvegarde des modifications ---
    const saveConfig = async (newConfig: WelcomeConfig) => {
        setConfig(newConfig); // Met à jour l'interface immédiatement
        try {
            await fetch(`${API_URL}/update-config/${serverId}/annonce-bienvenue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof WelcomeConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };
    
    // --- Affichage ---
    if (loading || !config) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold">Annonces de Bienvenue</h1>
                <p className="text-muted-foreground mt-2">
                Accueillez chaleureusement vos nouveaux membres avec un message personnalisé.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold">Configuration</h2>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                    <Separator />
                    <div>
                        <Label htmlFor="welcome-channel">Salon de bienvenue</Label>
                        <Select value={config.welcome_channel_id || 'none'} onValueChange={(val) => handleValueChange('welcome_channel_id', val === 'none' ? null : val)}>
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
                        <Textarea id="welcome-message" defaultValue={config.welcome_message} onBlur={(e) => handleValueChange('welcome_message', e.target.value)} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
