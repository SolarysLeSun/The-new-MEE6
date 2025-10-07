'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/combobox';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface AiAssistantConfig {
    enabled: boolean;
    command_permissions: { [key: string]: string | null };
}

interface DiscordRole {
    id: string;
    name: string;
}

const iaCommand = {
    name: '/ia',
    key: 'ia',
    description: "Pose une question à l'assistant IA personnel.",
};

function AiAssistantPageSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function AiAssistantPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<AiAssistantConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/ai-assistant`),
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
    
    const saveConfig = async (newConfig: AiAssistantConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/ai-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof AiAssistantConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleValueChange('command_permissions', newPermissions);
    };

    if (loading || !config) {
        return <AiAssistantPageSkeleton />;
    }

    const roleOptions = [
        { value: 'none', label: '@everyone' },
        ...roles.filter(r => r.name !== '@everyone').map(role => ({ value: role.id, label: role.name }))
    ];


  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assistant IA Personnel</h1>
        <p className="text-muted-foreground mt-2">
          Configurez l'accès à la commande `/ia` qui permet à chaque utilisateur d'avoir son propre assistant personnel.
        </p>
      </div>

      <Separator />
      
      <GlobalAiStatusAlert />

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Configuration du Module</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
              <div>
                  <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                   <p className="text-sm text-muted-foreground/80">Permet d'utiliser la commande `/ia` sur ce serveur.</p>
              </div>
              <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
          </div>
          <Separator />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <span>{iaCommand.name}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{iaCommand.description}</p>
            </div>
            <div className="w-full md:w-60">
                <Label className="text-xs font-medium">Rôle minimum requis</Label>
                <Combobox
                    options={roleOptions}
                    value={config.command_permissions?.[iaCommand.key] || 'none'}
                    onChange={(value) => handlePermissionChange(iaCommand.key, value)}
                    placeholder="Sélectionner un rôle"
                />
            </div>
          </div>
        </CardContent>
      </Card>
    </PageTransitionWrapper>
  );
}
