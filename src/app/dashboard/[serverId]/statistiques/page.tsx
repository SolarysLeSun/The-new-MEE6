
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, AlertTriangle } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface StatsChannelsConfig {
    enabled: boolean;
    category_id: string | null;
    channel_format: string;
}

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
    );
}

export default function StatsChannelsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<StatsChannelsConfig | null>(null);
    const [categories, setCategories] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/stats-channels`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setConfig(configData);
                setCategories(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 4));
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: StatsChannelsConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/stats-channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof StatsChannelsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const categoryOptions = [
        { value: 'none', label: 'Aucune' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart/> Salons de Statistiques
                </h1>
                <p className="text-muted-foreground mt-2">
                    Affichez des statistiques de serveur en temps réel via les noms des salons vocaux.
                </p>
            </div>
            
            <Separator />
            
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                    Ce module créera et gérera automatiquement un salon vocal dans la catégorie sélectionnée. Ne supprimez pas ce salon manuellement.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
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
                        <Label htmlFor="category-select" className="font-bold text-sm uppercase text-muted-foreground">Catégorie des statistiques</Label>
                        <p className="text-sm text-muted-foreground/80">
                            Choisissez la catégorie où le salon de statistiques sera créé.
                        </p>
                        <Combobox
                            options={categoryOptions}
                            value={config.category_id || 'none'}
                            onChange={(value) => handleValueChange('category_id', value === 'none' ? null : value)}
                            placeholder="Sélectionner une catégorie..."
                            searchPlaceholder="Rechercher une catégorie..."
                            emptyPlaceholder="Aucune catégorie trouvée."
                            className="w-full md:w-[320px]"
                        />
                    </div>
                    <Separator/>
                    <div className="space-y-2">
                        <Label htmlFor="channel-format" className="font-bold text-sm uppercase text-muted-foreground">Format du nom du salon</Label>
                        <p className="text-sm text-muted-foreground/80">
                          Utilisez les variables suivantes pour personnaliser le nom :<br/>
                          <code className="text-xs bg-muted p-1 rounded-sm">{'{membres}'}</code> - Nombre total de membres<br/>
                          <code className="text-xs bg-muted p-1 rounded-sm">{'{boosts}'}</code> - Nombre de boosts du serveur<br/>
                          <code className="text-xs bg-muted p-1 rounded-sm">{'{en_vocal}'}</code> - Membres actuellement en vocal
                        </p>
                        <Input 
                            id="channel-format"
                            value={config.channel_format}
                            onChange={(e) => handleValueChange('channel_format', e.target.value)}
                            placeholder="📊 Membres : {membres}"
                        />
                    </div>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
