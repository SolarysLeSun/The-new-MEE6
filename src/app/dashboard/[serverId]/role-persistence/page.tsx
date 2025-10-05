
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useServerInfo } from '@/hooks/use-server-info';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { ShieldPlus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface RolePersistenceConfig {
    enabled: boolean;
    required_role_id: string | null;
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
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

function RolePersistencePageContent({ isPremium }: { isPremium: boolean }) {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<RolePersistenceConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/role-persistence`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');

                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();

                setConfig(configData);
                setRoles(serverDetailsData.roles);
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: RolePersistenceConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/role-persistence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof RolePersistenceConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const roleOptions = [
        { value: 'none', label: 'Aucun (tout le monde)' },
        ...roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: `@${r.name}` }))
    ];

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper>
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration de la Persistance</CardTitle>
                        <CardDescription>
                            Activez la sauvegarde des rôles pour les membres qui quittent le serveur.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Les rôles des membres concernés seront sauvegardés à leur départ.
                                </p>
                            </div>
                            <Switch
                                id="enable-module"
                                checked={config.enabled}
                                onCheckedChange={(val) => handleValueChange('enabled', val)}
                            />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="required-role">Rôle requis pour la sauvegarde</Label>
                            <p className="text-sm text-muted-foreground/80">
                                Si un rôle est sélectionné, seuls les membres possédant ce rôle verront leurs rôles sauvegardés.
                            </p>
                             <Combobox
                                options={roleOptions}
                                value={config.required_role_id || 'none'}
                                onChange={(value) => handleValueChange('required_role_id', value === 'none' ? null : value)}
                                placeholder="Sélectionner un rôle..."
                                searchPlaceholder="Rechercher un rôle..."
                                emptyPlaceholder="Aucun rôle trouvé."
                                className="w-full md:w-[280px]"
                            />
                        </div>
                    </CardContent>
                </Card>
            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    );
}

export default function RolePersistencePage() {
    const { serverInfo, loading } = useServerInfo();

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    Persistance des Rôles
                    <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
                </h1>
                <p className="text-muted-foreground mt-2">
                    Sauvegardez les rôles d'un membre lorsqu'il quitte et restaurez-les automatiquement à son retour.
                </p>
            </div>
            <Separator />
            {loading ? <PageSkeleton /> : <RolePersistencePageContent isPremium={serverInfo?.isPremium || false} />}
        </PageTransitionWrapper>
    );
}
