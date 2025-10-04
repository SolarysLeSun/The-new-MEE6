

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface WebcamConfig {
    enabled: boolean;
    webcam_allowed: boolean;
    stream_allowed: boolean;
    exempt_roles: string[];
}

interface DiscordRole {
    id: string;
    name: string;
}

function WebcamControlPageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-10 w-full" />
                <Separator />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

export default function WebcamControlPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<WebcamConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/webcam`),
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

    const saveConfig = async (newConfig: WebcamConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/webcam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof WebcamConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    if (loading || !config) {
        return <WebcamControlPageSkeleton />;
    }
    
    const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contrôle Vidéo</h1>
        <p className="text-muted-foreground mt-2">
          Contrôlez l'utilisation de la webcam et du partage d'écran dans les salons vocaux.
        </p>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Options</h2>
          <p className="text-muted-foreground">
            Appliquez une politique globale pour tous les membres dans les salons vocaux.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                  <p className="text-sm text-muted-foreground/80">Active ou désactive la gestion de la vidéo.</p>
                </div>
                <Switch
                    id="enable-module"
                    checked={config.enabled}
                    onCheckedChange={(val) => handleValueChange('enabled', val)}
                />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webcam-allowed" className="font-bold text-sm uppercase text-muted-foreground">Autoriser la webcam</Label>
                   <p className="text-sm text-muted-foreground/80">Permet aux membres d'activer leur caméra.</p>
                </div>
                <Switch
                    id="webcam-allowed"
                    checked={config.webcam_allowed}
                    onCheckedChange={(val) => handleValueChange('webcam_allowed', val)}
                />
            </div>
             <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="stream-allowed" className="font-bold text-sm uppercase text-muted-foreground">Autoriser le partage d'écran</Label>
                   <p className="text-sm text-muted-foreground/80">Permet aux membres de partager leur écran.</p>
                </div>
                <Switch
                    id="stream-allowed"
                    checked={config.stream_allowed}
                    onCheckedChange={(val) => handleValueChange('stream_allowed', val)}
                />
            </div>
            <Separator />
             <div className="space-y-2">
                <Label htmlFor="exempt-roles" className="font-bold text-sm uppercase text-muted-foreground">Rôles exemptés</Label>
                 <p className="text-sm text-muted-foreground/80">
                    Les utilisateurs avec ces rôles ne seront pas affectés par la politique ci-dessus.
                </p>
                <MultiSelectCombobox
                    options={roleOptions}
                    selected={config.exempt_roles || []}
                    onSelectedChange={(selected) => handleValueChange('exempt_roles', selected)}
                    placeholder="Sélectionner des rôles..."
                />
            </div>
        </CardContent>
      </Card>
    </PageTransitionWrapper>
  );
}
