
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Megaphone, PlusCircle, Search, Settings } from 'lucide-react';
import type { Module } from '@/types';
import { cn } from '@/lib/utils';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const communityModules = [
    {
        id: 'annonce-bienvenue',
        name: 'Annonces de Bienvenue',
        creator: 'Marcus Team',
        description: 'Un module simple pour accueillir chaleureusement vos nouveaux membres avec un message personnalisable.',
        icon: Megaphone,
        isCertified: true,
    },
    // ... d'autres modules peuvent être ajoutés ici
];

function ModuleCard({ module, isInstalled, onAdd, onManage }: { module: any, isInstalled: boolean, onAdd: (id: Module) => void, onManage: (id: Module) => void }) {
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        setLoading(true);
        await onAdd(module.id);
        setLoading(false);
    }
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <module.icon className="w-8 h-8 text-primary" />
                        <div>
                            <CardTitle>{module.name}</CardTitle>
                            <CardDescription>par {module.creator}</CardDescription>
                        </div>
                    </div>
                    {module.isCertified && <Badge variant="secondary" className="border-green-500/50 text-green-400">Certifié</Badge>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{module.description}</p>
            </CardContent>
            <CardContent>
                {isInstalled ? (
                     <Button variant="outline" className="w-full" onClick={() => onManage(module.id)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer
                    </Button>
                ) : (
                    <Button className="w-full" onClick={handleAdd} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Ajouter au serveur
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function CommunityModulesPage() {
    const params = useParams();
    const router = useRouter();
    const serverId = params.serverId as string;
    const { toast } = useToast();
    const [installedModules, setInstalledModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInstalledModules = useCallback(async () => {
         try {
            const panelToken = localStorage.getItem(`panel_token_${serverId}`);
            const res = await fetch(`${API_URL}/get-all-module-configs/${serverId}`, {
                headers: { 'Authorization': `Bearer ${panelToken}` }
            });
            if (!res.ok) throw new Error('Failed to fetch installed modules');
            const data: {module: Module, config: any}[] = await res.json();
            setInstalledModules(data.map(d => d.module));
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de récupérer les modules installés.", variant: "destructive" });
        }
    }, [serverId, toast]);

    useEffect(() => {
        setLoading(true);
        fetchInstalledModules().finally(() => setLoading(false));
    }, [fetchInstalledModules]);

    const handleAddModule = async (moduleId: Module) => {
        try {
            const panelToken = localStorage.getItem(`panel_token_${serverId}`);
            // Simply call the get-config endpoint for a module that doesn't exist.
            // The backend is designed to create a default config if one isn't found.
            await fetch(`${API_URL}/get-config/${serverId}/${moduleId}`, {
                 headers: { 'Authorization': `Bearer ${panelToken}` }
            });
            toast({
                title: "Module Ajouté !",
                description: `${moduleId} a été ajouté à votre serveur. Vous pouvez maintenant le configurer.`,
            });
            await fetchInstalledModules();
             router.push(`/dashboard/${serverId}/${moduleId}`);
        } catch (error) {
             toast({ title: "Erreur", description: "Impossible d'ajouter le module.", variant: "destructive" });
        }
    };
    
    const handleManageModule = (moduleId: Module) => {
        router.push(`/dashboard/${serverId}/${moduleId}`);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Modules Communautaires</h1>
                <p className="text-muted-foreground mt-2">
                    Parcourez, ajoutez et gérez des fonctionnalités créées par la communauté pour enrichir votre serveur.
                </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Rechercher des modules..." className="pl-10" />
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" disabled>
                        Trier par...
                    </Button>
                    <Button variant="outline" disabled>
                       Certifiés seulement
                    </Button>
                     <Button disabled>
                        <PlusCircle className="mr-2" />
                        Créer un module
                    </Button>
                </div>
            </div>

            <Separator />
            
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communityModules.map(module => (
                        <ModuleCard
                            key={module.id}
                            module={module}
                            isInstalled={installedModules.includes(module.id as Module)}
                            onAdd={handleAddModule}
                            onManage={handleManageModule}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Dummy loader for now as it's a new page with no complex data
function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-loader-circle", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
    )
}
