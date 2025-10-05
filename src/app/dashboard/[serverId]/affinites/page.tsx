
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageSquare, Mic, AtSign } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import type { ModuleConfig } from '@/types';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface AffinitesConfig {
    enabled: boolean;
    points_per_mention: number;
    points_per_message: number;
    points_per_minute_in_voice: number;
    command_permissions: { [key: string]: string | null };
}

interface DiscordRole {
    id: string;
    name: string;
}

const affinityCommands = [
    { name: '/affinites', key: 'affinites', description: "Affiche les classements d'affinités." },
];

function PageSkeleton() {
    return (
        <div className="space-y-8">
             <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Separator/>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function AffinitesPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<AffinitesConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/affinites`),
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

    const saveConfig = async (newConfig: AffinitesConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/affinites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof AffinitesConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleValueChange('command_permissions', newPermissions);
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }
    
    const roleOptions = [
        { value: 'none', label: '@everyone' },
        ...roles.filter(r => r.name !== '@everyone').map(role => ({ value: role.id, label: role.name }))
    ];

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Affinités</h1>
                <p className="text-muted-foreground mt-2">
                    Mesurez et récompensez les liens entre vos membres en attribuant des points pour leurs interactions.
                </p>
            </div>
            
            <Separator />
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <CardTitle>Configuration</CardTitle>
                        <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                    </div>
                     <CardDescription>Activez le module et définissez le barème de points.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                             <Label htmlFor="points-message" className="flex items-center gap-2"><MessageSquare/> Points par Message</Label>
                             <Input id="points-message" type="number" defaultValue={config.points_per_message} onBlur={(e) => handleValueChange('points_per_message', parseInt(e.target.value) || 0)}/>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="points-mention" className="flex items-center gap-2"><AtSign/> Points par Mention</Label>
                             <Input id="points-mention" type="number" defaultValue={config.points_per_mention} onBlur={(e) => handleValueChange('points_per_mention', parseInt(e.target.value) || 0)}/>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="points-voice" className="flex items-center gap-2"><Mic/> Points par Minute en Vocal</Label>
                             <Input id="points-voice" type="number" defaultValue={config.points_per_minute_in_voice} onBlur={(e) => handleValueChange('points_per_minute_in_voice', parseInt(e.target.value) || 0)}/>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Commande</CardTitle>
                </CardHeader>
                <CardContent>
                    {affinityCommands.map((command) => (
                        <div key={command.key} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-primary" />
                                    <span>{command.name}</span>
                                </h3>
                                <p className="text-sm text-muted-foreground">{command.description}</p>
                            </div>
                            <div className="w-full md:w-60">
                                <Label className="text-xs font-medium">Rôle minimum requis</Label>
                                <Combobox
                                    options={roleOptions}
                                    value={config.command_permissions?.[command.key] || 'none'}
                                    onChange={(value) => handlePermissionChange(command.key, value)}
                                    placeholder="Sélectionner un rôle"
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
