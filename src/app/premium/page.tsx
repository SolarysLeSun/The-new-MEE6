
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, KeyRound, Star } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import RippleGrid from '@/components/ripple-grid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select"

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const premiumFeatures = [
    "Accès à toutes les fonctionnalités IA",
    "Commandes exclusives (/moveall, etc.)",
    "Génération d'images et de contenu",
    "Personnages IA autonomes (bientôt)",
    "Support prioritaire sur Discord",
    "Et bien plus encore à venir..."
];

interface ServerInfo {
  id: string;
  name: string;
}

function PremiumActivationDialog({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [key, setKey] = useState('');
    const [selectedGuild, setSelectedGuild] = useState('');
    const [guilds, setGuilds] = useState<ServerInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const storedGuildIds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
        const fetchGuilds = async () => {
            if (storedGuildIds.length > 0) {
                 const response = await fetch(`${API_URL}/get-servers-details`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guildIds: storedGuildIds }),
                });
                if(response.ok) {
                    const data = await response.json();
                    setGuilds(data);
                    if(data.length > 0) {
                        setSelectedGuild(data[0].id);
                    }
                }
            }
        }
        fetchGuilds();
    }, []);

    const handleRedeem = async () => {
        if (!key || !selectedGuild) {
            toast({
                title: "Champs manquants",
                description: "Veuillez entrer une clé et sélectionner un serveur.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/redeem-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId: selectedGuild, key }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Une erreur est survenue.');
            }
            toast({
                title: "Succès !",
                description: result.message,
            });
        } catch (error: any) {
             toast({
                title: "Erreur d'activation",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Activer une clé Premium</DialogTitle>
                    <DialogDescription>
                        Entrez la clé d'activation que vous avez reçue pour débloquer les fonctionnalités Premium sur votre serveur.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="guild-select">Serveur Discord</Label>
                        <Select value={selectedGuild} onValueChange={setSelectedGuild}>
                            <SelectTrigger id="guild-select">
                                <SelectValue placeholder="Sélectionnez un serveur" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {guilds.length > 0 ? guilds.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    )) : <SelectLabel>Aucun serveur autorisé</SelectLabel>}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="premium-key">Clé d'activation</Label>
                        <Input id="premium-key" placeholder="MARCUS-XXXXXXXX" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button onClick={handleRedeem} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Activer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PremiumPage() {
    const searchParams = useSearchParams();
    const showKeyRedemption = searchParams.get('action') === 'redeem';

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground">
             <div className="absolute inset-0 z-0">
                <RippleGrid
                    gridColor="#ffffff10"
                    rippleIntensity={0.03}
                    gridSize={25}
                    fadeDistance={1}
                    vignetteStrength={1.5}
                />
            </div>

            <AppHeader />
            
            <main className="relative z-10 container mx-auto flex flex-col items-center justify-center px-4 py-24 sm:py-32">
                <Card className="max-w-2xl w-full bg-card/60 backdrop-blur-sm shadow-lg border-primary/20">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                             <div className="p-3 bg-yellow-400/10 rounded-full border-2 border-yellow-400/30">
                                <Star className="h-8 w-8 text-yellow-400"/>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">Marcus Premium</h1>
                        <CardDescription className="text-lg text-muted-foreground mt-2">
                            Débloquez tout le potentiel de votre serveur Discord.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ul className="space-y-3 text-card-foreground">
                            {premiumFeatures.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-base">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                             <a href='https://ko-fi.com/M4M21555O9' target='_blank' rel='noopener noreferrer' className='w-full'>
                                <Button size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                                    Soutenir via Ko-fi
                                </Button>
                            </a>
                             <PremiumActivationDialog>
                                <Button size="lg" variant="secondary" className="w-full">
                                    <KeyRound className="mr-2"/>
                                    Activer une clé
                                </Button>
                            </PremiumActivationDialog>
                        </div>
                         <p className="text-xs text-center text-muted-foreground pt-4">Le statut Premium s'applique à un seul serveur Discord par clé ou par abonnement.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
