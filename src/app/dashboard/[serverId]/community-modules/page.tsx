

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
import { Check, Loader2, Megaphone, PlusCircle, Search, Settings, BookCopy } from 'lucide-react';
import type { Module } from '@/types';
import Link from 'next/link';


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
    const IconComponent = module.icon;

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
                        <IconComponent className="w-8 h-8 text-primary" />
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
                     <Button variant="outline" className="w-full" asChild>
                        <Link href={`/dashboard/${useParams().serverId}/${module.id}`}>
                            <Settings className="mr-2 h-4 w-4" />
                            Gérer
                        </Link>
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
    const [authHeader, setAuthHeader] = useState('');

    useEffect(() => {
        const token = localStorage.getItem(`panel_token_${serverId}`);
        if (token) {
            setAuthHeader(`Bearer ${token}`);
        } else {
            // Handle case where token is not found, maybe redirect to login
            toast({ title: "Erreur d'authentification", description: "Token non trouvé.", variant: "destructive"});
            setLoading(false);
        }
    }, [serverId, toast]);

    const fetchInstalledModules = useCallback(async () => {
        if (!authHeader) return;
         try {
            const res = await fetch(`${API_URL}/get-all-module-configs/${serverId}`, {
                headers: { 'Authorization': authHeader }
            });
            if (!res.ok) throw new Error('Failed to fetch installed modules');
            const data: {module: Module, config: any}[] = await res.json();
            setInstalledModules(data.map(d => d.module));
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de récupérer les modules installés.", variant: "destructive" });
        }
    }, [serverId, toast, authHeader]);

    useEffect(() => {
        if(authHeader) {
            setLoading(true);
            fetchInstalledModules().finally(() => setLoading(false));
        }
    }, [authHeader, fetchInstalledModules]);

    const handleAddModule = async (moduleId: Module) => {
        if (!authHeader) return;
        try {
            // Simply call the get-config endpoint for a module that doesn't exist.
            // The backend is designed to create a default config if one isn't found.
            await fetch(`${API_URL}/get-config/${serverId}/${moduleId}`, {
                 headers: { 'Authorization': authHeader }
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
