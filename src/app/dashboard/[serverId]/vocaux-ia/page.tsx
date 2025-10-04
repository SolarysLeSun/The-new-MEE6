

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { Combobox } from '@/components/ui/combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Config Type
interface SmartVoiceConfig {
    enabled: boolean;
    interactive_category_id: string | null;
    default_channel_name: string;
    custom_instructions: string;
}
interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

function SmartVoicePageContent({ isPremium }: { isPremium: boolean }) {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<SmartVoiceConfig | null>(null);
    const [categories, setCategories] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/smart-voice`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setConfig(configData);
                setCategories(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 4)); // Category channels
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: SmartVoiceConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/smart-voice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof SmartVoiceConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <Skeleton className="w-full h-[400px]" />;
    }
    
    const categoryOptions = [
        { value: 'none', label: 'Aucune' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper className="space-y-8">
                <GlobalAiStatusAlert />
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">Options Générales</h2>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                            </div>
                            <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                             <Label htmlFor="interactive-category" className="font-bold text-sm uppercase text-muted-foreground">Catégorie des salons interactifs</Label>
                             <p className="text-sm text-muted-foreground/80">
                                Tous les salons vocaux dans cette catégorie seront gérés par l'IA.
                            </p>
                             <Combobox
                                options={categoryOptions}
                                value={config.interactive_category_id || 'none'}
                                onChange={(value) => handleValueChange('interactive_category_id', value === 'none' ? null : value)}
                                placeholder="Sélectionner une catégorie..."
                                searchPlaceholder="Rechercher une catégorie..."
                                emptyPlaceholder="Aucune catégorie trouvée."
                                className="w-full md:w-[320px]"
                            />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="custom-instructions" className="font-bold text-sm uppercase text-muted-foreground">Instructions Personnalisées</Label>
                            <p className="text-sm text-muted-foreground/80">
                               Donnez des instructions spécifiques à l'IA pour la génération des noms (ex: "Utilise un ton humoristique", "Fais des références à la pop culture").
                            </p>
                            <Textarea 
                                id="custom-instructions"
                                placeholder="Ex: Toujours inclure un emoji lié au jeu. Garder les noms courts et percutants."
                                defaultValue={config.custom_instructions}
                                onBlur={(e) => handleValueChange('custom_instructions', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>
            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    )
}

export default function SmartVoicePage() {
    const { serverInfo, loading } = useServerInfo();
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            IA Vocaux
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
            L'IA gère les salons vocaux : elle génère un nom en fonction de l'activité des membres. Si le salon est vide, il est renommé "Vocal intéractif".
        </p>
      </div>

      <Separator />

      {loading ? (
        <Skeleton className="w-full h-[400px]" />
      ) : (
        <SmartVoicePageContent isPremium={serverInfo?.isPremium || false} />
      )}
    </PageTransitionWrapper>
  );
}

    