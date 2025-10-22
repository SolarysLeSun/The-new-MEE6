

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dice5, MessageCircle, Flag, Ban, RussianRuble } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface FunCommandsConfig {
  enabled: boolean;
  command_permissions: { [key: string]: string | null };
  gaypride_enabled?: boolean;
  oktban_enabled?: boolean;
  poutine_enabled?: boolean;
}
interface DiscordRole {
    id: string;
    name: string;
}

const funCommands = [
    { name: '/renameall', key: 'renameall', description: 'Renomme tous les membres du serveur.', defaultEveryone: false, icon: MessageCircle },
    { name: '/mutemass', key: 'mutemass', description: 'Rend tous les utilisateurs d\'un salon vocal muets.', defaultEveryone: false, icon: MessageCircle },
    { name: '/reactbomb', key: 'reactbomb', description: 'Bombarde un message de réactions aléatoires.', defaultEveryone: false, icon: MessageCircle },
    { name: '/react', key: 'react', description: 'Réagit à un message avec un emoji spécifique.', defaultEveryone: false, icon: MessageCircle },
    { name: '/randomnickname', key: 'randomnickname', description: 'Donne un surnom aléatoire à un ou plusieurs utilisateurs.', defaultEveryone: false, icon: MessageCircle },
    { name: '/pileouface', key: 'pileouface', description: 'Pariez votre XP sur un lancer de pièce.', isLevel: true, defaultEveryone: true, icon: Dice5 },
    { name: '/slots', key: 'slots', description: 'Jouez à la machine à sous avec votre XP.', isLevel: true, defaultEveryone: true, icon: Dice5 },
    { name: '/de', key: 'de', description: 'Lance un ou plusieurs dés.', defaultEveryone: true, icon: Dice5 },
    { name: '/action-verite', key: 'action-verite', description: 'Joue à Action ou Vérité avec les membres du salon.', defaultEveryone: true, icon: Dice5 },
    { name: '/gaypride', key: 'gaypride', description: 'Réagit 🏳️‍🌈 à chaque nouveau message.', defaultEveryone: false, icon: Flag },
    { name: '/oktban', key: 'oktban', description: 'Réagit avec l\'émoji OK T BAN.', defaultEveryone: false, icon: Ban },
    { name: '/poutine', key: 'poutine', description: 'Réagit avec l\'émoji Poutine.', defaultEveryone: false, icon: RussianRuble },
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
                {[...Array(4)].map((_, i) => (
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

export default function FunCommandsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<FunCommandsConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
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

    const saveConfig = async (newConfig: FunCommandsConfig) => {
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

    const adminRoleOptions = [
        { value: 'none', label: 'Admin seulement' },
        ...roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }))
    ];
    const everyoneRoleOptions = [{ value: 'none', label: '@everyone' }, ...adminRoleOptions.slice(1)];


  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commandes de Divertissement</h1>
        <p className="text-muted-foreground mt-2">
          Gérez l'accès aux commandes "fun" du bot.
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
            {funCommands.map(command => (
                 <Card key={command.name}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <command.icon className="w-5 h-5 text-primary" />
                                <span>{command.name}</span>
                            </div>
                        </CardTitle>
                        <CardDescription>{command.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor={`role-select-${command.key}`} className="text-sm font-medium">Rôle minimum requis</Label>
                            <Combobox
                                options={command.defaultEveryone ? everyoneRoleOptions : adminRoleOptions}
                                value={config.command_permissions?.[command.key] || 'none'}
                                onChange={(value) => handlePermissionChange(command.key, value)}
                                placeholder="Sélectionner un rôle"
                                searchPlaceholder="Rechercher un rôle..."
                                emptyPlaceholder="Aucun rôle trouvé."
                            />
                             {command.isLevel && <p className="text-xs text-muted-foreground pt-1">Cette commande est liée au système de niveaux.</p>}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </PageTransitionWrapper>
  );
}
