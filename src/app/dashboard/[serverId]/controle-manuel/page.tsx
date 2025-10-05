

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Languages, Voicemail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface ManualVoiceConfig {
    enabled: boolean;
    command_permissions: { [key: string]: string | null };
}

interface AutorolesConfig {
    on_voice_join_roles: string[];
}

interface DiscordRole {
    id: string;
    name: string;
}

const manualVoiceCommands = [
  {
    name: '/join',
    key: 'join',
    description: 'Fait rejoindre le bot dans votre salon vocal.',
  },
  {
    name: '/leave',
    key: 'leave',
    description: 'Fait quitter le bot de son salon vocal.',
  },
  {
      name: '/parle',
      key: 'parle',
      description: 'Fait parler le bot dans le salon vocal actuel.',
      isPremium: true
  }
];

function ManualControlPageSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
}


export default function ManualControlPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [manualConfig, setManualConfig] = useState<ManualVoiceConfig | null>(null);
    const [autorolesConfig, setAutorolesConfig] = useState<AutorolesConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [manualRes, autorolesRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/manual-voice-control`),
                    fetch(`${API_URL}/get-config/${serverId}/autoroles`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!manualRes.ok || !autorolesRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');
                const manualData = await manualRes.json();
                const autorolesData = await autorolesRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setManualConfig(manualData);
                setAutorolesConfig(autorolesData);
                setRoles(serverDetailsData.roles);
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveManualConfig = async (newConfig: ManualVoiceConfig) => {
        setManualConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/manual-voice-control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
     const saveAutorolesConfig = async (newConfig: Partial<AutorolesConfig>) => {
        const fullConfig = { ...(autorolesConfig || { on_voice_join_roles: [] }), ...newConfig };
        setAutorolesConfig(fullConfig); // Optimistic update
        try {
            // We fetch the full autoroles config to avoid overwriting other settings
            const currentAutorolesRes = await fetch(`${API_URL}/get-config/${serverId}/autoroles`);
            const currentAutorolesData = await currentAutorolesRes.json();
            
            await fetch(`${API_URL}/update-config/${serverId}/autoroles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentAutorolesData, ...newConfig }),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde (autoroles)", variant: "destructive" });
        }
    };

    const handleManualValueChange = (key: keyof ManualVoiceConfig, value: any) => {
        if (!manualConfig) return;
        saveManualConfig({ ...manualConfig, [key]: value });
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!manualConfig) return;
        const newPermissions = { ...manualConfig.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleManualValueChange('command_permissions', newPermissions);
    };

    const handleVoiceRolesChange = (selectedRoles: string[]) => {
        if (!autorolesConfig) return;
        saveAutorolesConfig({ on_voice_join_roles: selectedRoles });
    };

    if (loading || !manualConfig || !autorolesConfig) {
        return <ManualControlPageSkeleton />;
    }

    const roleOptions = [
        { value: 'none', label: '@everyone' },
        ...roles.filter(r => r.name !== '@everyone').map(role => ({ value: role.id, label: role.name }))
    ];
    
    const multiSelectRoleOptions = roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }));

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contrôle Manuel (Vocal)</h1>
        <p className="text-muted-foreground mt-2">
          Invitez, déconnectez ou faites parler le bot manuellement dans les salons vocaux.
        </p>
      </div>

      <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Activation du module</CardTitle>
                    <Switch
                        checked={manualConfig.enabled}
                        onCheckedChange={(val) => handleManualValueChange('enabled', val)}
                    />
                </div>
            </CardHeader>
        </Card>

      {/* Section Rôle en vocal */}
       <Card>
            <CardHeader>
                <CardTitle>Rôle en Vocal</CardTitle>
                <CardDescription>
                    Attribuez automatiquement des rôles lorsqu'un membre rejoint un salon vocal, et retirez-les quand il quitte.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="voice-roles" className="font-bold">Rôles à gérer</Label>
                    <MultiSelectCombobox
                        options={multiSelectRoleOptions}
                        selected={autorolesConfig.on_voice_join_roles || []}
                        onSelectedChange={handleVoiceRolesChange}
                        placeholder="Sélectionner des rôles..."
                    />
                </div>
            </CardContent>
        </Card>

      {/* Section Commandes */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Commandes</h2>
          <p className="text-muted-foreground">
            Gérez les permissions pour chaque commande de ce module.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manualVoiceCommands.map((command) => (
            <Card key={command.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Voicemail className="w-5 h-5 text-primary" />
                  <span>{command.name}</span>
                   {command.isPremium && <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>}
                </CardTitle>
                <CardDescription>{command.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label
                    htmlFor={`role-select-${command.key}`}
                    className="text-sm font-medium"
                  >
                    Rôle minimum requis
                  </Label>
                  <Combobox
                    options={roleOptions}
                    value={manualConfig.command_permissions?.[command.key] || 'none'}
                    onChange={(value) => handlePermissionChange(command.key, value)}
                    placeholder="Sélectionner un rôle"
                    searchPlaceholder="Rechercher un rôle..."
                    emptyPlaceholder="Aucun rôle trouvé."
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
         <Alert className="border-primary/30">
            <Languages className="h-4 w-4" />
            <AlertTitle>Bientôt disponible : Traduction Vocale Instantanée</AlertTitle>
            <AlertDescription>
                Une future fonctionnalité permettra au bot de traduire en temps réel les paroles des membres entre différentes langues, unifiant ainsi votre communauté internationale.
            </AlertDescription>
        </Alert>

      </div>
    </PageTransitionWrapper>
  );
}
