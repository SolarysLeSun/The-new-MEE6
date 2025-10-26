
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, AlertTriangle, Loader2 } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-48" />
            </CardContent>
        </Card>
    );
}

export default function StatsChannelsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [loading, setLoading] = useState(false);


    const handleUpdate = async () => {
        setIsUpdating(true);
        toast({
            title: "Mise à jour en cours...",
            description: "Le bot va créer ou mettre à jour la catégorie de statistiques. Cela peut prendre un instant.",
        });
        try {
            const response = await fetch(`${API_URL}/stats-channels/create/${serverId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Une erreur inconnue est survenue.");
            }
            const result = await response.json();
            toast({
                title: "Succès !",
                description: result.message,
            });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };
    
    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart/> Salons de Statistiques
                </h1>
                <p className="text-muted-foreground mt-2">
                    Affichez des statistiques de serveur en temps réel dans une catégorie de salons dédiée.
                </p>
            </div>
            
            <Separator />
            
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                    Cette action créera une nouvelle catégorie et trois salons vocaux en haut de la liste des salons de votre serveur. Ne supprimez pas ces éléments manuellement, le bot les gère automatiquement.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Mise en place</CardTitle>
                    <CardDescription>
                        Cliquez sur le bouton ci-dessous pour que le bot crée ou mette à jour la catégorie "Statistiques du Serveur" et les salons vocaux associés. Les noms des salons seront actualisés toutes les 5 minutes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleUpdate} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
                        Mettre en place / Mettre à jour les statistiques
                    </Button>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
