
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface ReferralConfig {
    enabled: boolean;
    referral_code: string;
    referral_count: number;
}

function PageSkeleton() {
    return (
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
    );
}

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

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Gift /> Parrainage</h1>
                <p className="text-muted-foreground mt-2">
                    Partagez votre code unique et gagnez des récompenses Premium pour votre serveur !
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Votre Code de Parrainage</CardTitle>
                    <CardDescription>
                        Partagez ce code avec d'autres propriétaires de serveurs. Lorsqu'ils l'utilisent avec la commande `/parrainage`, vous progressez vers votre prochaine récompense.
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
                    <CardTitle>Votre Progression</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">
                        Vous avez parrainé <span className="font-bold text-primary">{config.referral_count || 0}</span> serveurs uniques.
                    </p>
                    <p className="text-muted-foreground">
                        Atteignez 10 parrainages pour recevoir 1 mois de Premium gratuit !
                    </p>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}
