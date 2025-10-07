
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface RoleMemoryConfig {
    enabled: boolean;
    premium: boolean;
    trigger_roles: string[];
}

interface DiscordRole {
    id: string;
    name: string;
}

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Separator/>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-80" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
    );
}

function RoleMemoryPageContent({ isPremium, serverId }: { isPremium: boolean, serverId: string }) {
    const { toast } = useToast();

    const [config, setConfig] = useState<RoleMemoryConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/role-memory`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));

            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: RoleMemoryConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/role-memory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof RoleMemoryConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const roleOptions = roles.map(r => ({ value: r.id, label: `@${r.name}` }));

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper>
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration de la Persistance</CardTitle>
                        <CardDescription>
                           Le bot sauvegardera les rôles d'un membre s'il quitte, et les lui réattribuera à son retour.
                        </CardDescription>
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
                            <Label htmlFor="trigger-roles" className="font-bold">Rôles Déclencheurs</Label>
                            <p className="text-sm text-muted-foreground">
                                Si un membre possède l'un de ces rôles, ses autres rôles seront sauvegardés à son départ. Si vous ne sélectionnez aucun rôle, TOUS les membres seront sauvegardés.
                            </p>
                            <MultiSelectCombobox
                                options={roleOptions}
                                selected={config.trigger_roles || []}
                                onSelectedChange={(selected) => handleValueChange('trigger_roles', selected)}
                                placeholder="Sélectionner des rôles..."
                            />
                        </div>
                         <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Comment ça marche ?</AlertTitle>
                            <AlertDescription>
                                Uniquement les rôles que le bot peut gérer (ceux qui sont plus bas que son propre rôle dans la hiérarchie) seront sauvegardés et restaurés.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    );
}

export default function RoleMemoryPage() {
    const { serverInfo, loading } = useServerInfo();
    const params = useParams();
    const serverId = params.serverId as string;

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Save /> Persistance des Rôles
                    <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
                </h1>
                <p className="text-muted-foreground mt-2">
                    Ne perdez plus les rôles de vos membres importants lorsqu'ils quittent temporairement.
                </p>
            </div>
            
            <Separator />

            {loading ? (
                <PageSkeleton />
            ) : (
                <RoleMemoryPageContent isPremium={serverInfo?.isPremium || false} serverId={serverId} />
            )}
        </PageTransitionWrapper>
    );
}
