
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Wrench, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface UtilsConfig {
  enabled: boolean;
  command_permissions: { [key: string]: string | null };
}
interface DiscordRole {
    id: string;
    name: string;
}

const utilCommands = [
    { name: '/save', key: 'save', description: 'Sauvegarde la conversation du salon actuel en fichier HTML.' },
    { name: '/patchnote', key: 'patchnote', description: 'Fait corriger ou améliorer un texte par l\'IA.' },
    { name: '/rappel', key: 'rappel', description: 'Définit un rappel personnel.' },
    { name: '/setprofil', key: 'setprofil', description: 'Définit votre biographie et vos liens de profil.', icon: User },
    { name: '/profil', key: 'profil', description: 'Affiche le profil d\'un utilisateur.', icon: User },
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

export default function UtilsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<UtilsConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/utils`),
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

    const saveConfig = async (newConfig: UtilsConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/utils`, {
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
        { value: 'none', label: 'Admin seulement' },
        ...roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }))
    ];
    const everyoneRoleOption = [{ value: 'none', label: '@everyone' }, ...roleOptions.slice(1)];


  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commandes Utilitaires</h1>
        <p className="text-muted-foreground mt-2">
          Gérez l'accès aux commandes utilitaires du bot.
        </p>
      </div>
      
      <Separator />

       <Card>
        <CardHeader>
          <CardTitle>Options Générales</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between">
                <div>
                    <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                    <p className="text-sm text-muted-foreground/80">Active ou désactive toutes les commandes de cette catégorie.</p>
                </div>
                <Switch 
                    id="enable-module" 
                    checked={config.enabled} 
                    onCheckedChange={(val) => saveConfig({ ...config, enabled: val })}
                />
            </div>
        </CardContent>
      </Card>

       <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Commandes</h2>
          <p className="text-muted-foreground">
            Gérez la disponibilité et les permissions pour chaque commande.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {utilCommands.map(command => (
                 <Card key={command.name}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {command.icon ? <command.icon className="w-5 h-5 text-primary" /> : <Wrench className="w-5 h-5 text-primary" />}
                                <span>{command.name}</span>
                            </div>
                        </CardTitle>
                        <CardDescription>{command.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor={`role-select-${command.key}`} className="text-sm font-medium">Rôle minimum requis</Label>
                            <Combobox
                                options={command.key === 'rappel' || command.key === 'profil' || command.key === 'setprofil' ? everyoneRoleOption : roleOptions}
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
