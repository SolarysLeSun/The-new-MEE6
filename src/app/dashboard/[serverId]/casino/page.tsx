
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Gamepad } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
// Using a generic config as this module doesn't have specific settings yet,
// but it will likely have command permissions.
interface CasinoConfig {
  enabled: boolean;
  command_permissions: { [key: string]: string | null };
}
interface DiscordRole {
    id: string;
    name: string;
}

const casinoCommands = [
    { name: '/pileouface', key: 'pileouface', description: 'Lance une pièce pour parier des XP.' },
    { name: '/slots', key: 'slots', description: 'Joue à la machine à sous avec des XP.' },
];

function PageSkeleton() {
    return (
        <div className="space-y-8 text-white max-w-4xl">
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-full mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default function CasinoPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    // The config for casino might live under 'fun-commands' or a new 'casino' module
    // For simplicity, let's assume it's part of 'fun-commands' for now.
    const [config, setConfig] = useState<CasinoConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Assuming casino config is part of fun-commands
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/fun-commands`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);

                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setConfig(configData);
                setRoles(serverDetailsData.roles);
            } catch (error) {
                toast({
                    title: "Erreur",
                    description: "Impossible de charger les données.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: CasinoConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/fun-commands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({
                title: "Erreur de sauvegarde",
                variant: "destructive",
            });
        }
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        saveConfig({ ...config, command_permissions: newPermissions });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const roleOptions = [
        { value: 'none', label: '@everyone' },
        ...roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }))
    ];

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Casino</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les commandes de jeu où les membres peuvent parier leur XP.
        </p>
      </div>
      
      <Separator />

       <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Commandes</h2>
          <p className="text-muted-foreground">
            Gérez la disponibilité et les permissions pour chaque jeu.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {casinoCommands.map(command => (
                 <Card key={command.name}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Gamepad className="w-5 h-5 text-primary" />
                                <span>{command.name}</span>
                            </div>
                        </CardTitle>
                        <CardDescription>{command.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor={`role-select-${command.key}`} className="text-sm font-medium">Rôle minimum requis</Label>
                            <Combobox
                                options={roleOptions}
                                value={config.command_permissions?.[command.key] || 'none'}
                                onChange={(value) => handlePermissionChange(command.key, value)}
                                placeholder="Sélectionner un rôle"
                                searchPlaceholder="Rechercher un rôle..."
                                emptyPlaceholder="Aucun rôle trouvé."
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </PageTransitionWrapper>
  );
}
