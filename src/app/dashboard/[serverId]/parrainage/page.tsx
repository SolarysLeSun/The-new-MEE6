

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Progress } from '@/components/ui/progress';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface ReferralConfig {
    enabled: boolean;
    referral_code: string;
    referral_count: number;
}

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

const REWARD_GOAL = 10;

export default function ReferralPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<ReferralConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const configRes = await fetch(`${API_URL}/get-config/${serverId}/referral`);
                if (!configRes.ok) throw new Error('Failed to fetch config');
                const configData = await configRes.json();
                setConfig(configData);
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const handleCopy = () => {
        if (config?.referral_code) {
            navigator.clipboard.writeText(config.referral_code);
            setCopied(true);
            toast({ title: "Copié !", description: "Votre code de parrainage a été copié dans le presse-papiers." });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const progressPercentage = Math.min((config.referral_count / REWARD_GOAL) * 100, 100);

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Gift /> Parrainage</h1>
                <p className="text-muted-foreground mt-2">
                    Invitez d'autres serveurs à utiliser Marcus et gagnez des récompenses Premium !
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Votre Code de Parrainage</CardTitle>
                    <CardDescription>
                        Partagez ce code avec d'autres propriétaires de serveurs. Lorsqu'ils l'utilisent avec la commande <code className="bg-muted px-1.5 py-0.5 rounded-md">/parrainage</code>, vous progressez vers votre prochaine récompense.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input 
                            readOnly 
                            value={config.referral_code || "Génération..."} 
                            className="text-lg font-mono"
                        />
                        <Button variant="secondary" size="icon" onClick={handleCopy} disabled={!config.referral_code}>
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Votre Progression vers la Récompense</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg">
                        Vous avez parrainé <span className="font-bold text-primary">{config.referral_count || 0}</span> serveurs uniques.
                    </p>
                     <div className="space-y-2">
                        <Progress value={progressPercentage} className="w-full"/>
                        <p className="text-sm text-muted-foreground text-right">{config.referral_count} / {REWARD_GOAL} parrainages</p>
                    </div>
                     <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-500/20 rounded-full">
                                    <Star className="w-6 h-6 text-yellow-300"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-yellow-300">Prochaine récompense : 1 mois de Premium</h3>
                                    <p className="text-sm text-yellow-300/70">Atteignez {REWARD_GOAL} parrainages pour recevoir un mois de statut Premium gratuit pour ce serveur !</p>
                                </div>
                            </div>
                        </CardContent>
                     </Card>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Promotion de Lancement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-muted-foreground">
                        Pour célébrer le lancement de ce nouveau système, nous avons une offre spéciale !
                    </p>
                    <Card className="bg-primary/10 border-primary/30">
                         <CardContent className="pt-6">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-full">
                                    <Gift className="w-6 h-6 text-primary"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary">Parrainez 2 serveurs de 30+ membres !</h3>
                                    <p className="text-sm text-primary/80">Recevez **1 an de statut Testeur** (accès anticipé aux nouveautés) et **1 mois de Premium** pour votre serveur.</p>
                                </div>
                            </div>
                         </CardContent>
                    </Card>
                </CardContent>
             </Card>
        </PageTransitionWrapper>
    );
}
