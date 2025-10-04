
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, KeyRound, Star, XCircle, Bot, Sparkles, Hammer } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import RippleGrid from '@/components/ripple-grid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select"
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const featureComparison = [
    { feature: "Modération (ban, kick, mute, warn)", free: true, premium: true },
    { feature: "Auto-Modération & Filtres de mots", free: true, premium: true },
    { feature: "Logs détaillés des événements", free: true, premium: true },
    { feature: "Sécurité de base (Anti-Raid, Anti-Bot)", free: true, premium: true },
    { feature: "Système de niveaux et d'XP", free: true, premium: true },
    { feature: "Assistant Communautaire IA (FAQ)", free: false, premium: true },
    { feature: "Assistant Modération IA (Anti-toxicité)", free: false, premium: true },
    { feature: "Filtre d'Images & Liens IA", free: false, premium: true },
    { feature: "Générateur de contenu IA (Annonces, Règles)", free: false, premium: true },
    { feature: "Salons Vocaux Intelligents (IA Vocaux)", free: false, premium: true },
    { feature: "Commandes de masse (/moveall, /decoall)", free: false, premium: true },
    { feature: "Constructeur de Serveur IA", free: false, premium: true },
    { feature: "Système de Captcha", free: false, premium: true },
    { feature: "Support prioritaire sur Discord", free: false, premium: true },
];

const keyFeatures = [
    { icon: Sparkles, text: "Accès à toutes les fonctionnalités IA" },
    { icon: Hammer, text: "Commandes de modération avancées" },
    { icon: Bot, text: "Automatisation et gain de temps" },
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
                                {guilds.length > 0 ? (
                                    <SelectGroup>
                                        <SelectLabel>Vos serveurs</SelectLabel>
                                        {guilds.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                ) : (
                                    <SelectGroup>
                                        <SelectLabel>Aucun serveur autorisé</SelectLabel>
                                    </SelectGroup>
                                )}
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

const PricingCard = ({ plan, price, period, description, children, isBestValue }: { plan: string, price: string, period: string, description?: string, children: React.ReactNode, isBestValue?: boolean }) => (
    <Card className={cn(
        "flex flex-col bg-card/60 backdrop-blur-sm shadow-lg border-primary/20 relative",
        isBestValue && "border-primary shadow-primary/20"
    )}>
         {isBestValue && <Badge variant="destructive" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary border-none">Meilleur Choix</Badge>}
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{plan}</CardTitle>
            </div>
            <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold">{price}</span>
                <span className="text-muted-foreground">{period}</span>
            </div>
             {description && <CardDescription className="pt-1 !text-green-400 font-semibold">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
            <div className="space-y-3 text-sm flex-1">
                {keyFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature.text}</span>
                    </div>
                ))}
            </div>
            {children}
        </CardContent>
    </Card>
);

export default function PremiumPage() {
    const prices = {
        monthly: 9.99,
        yearly: 24.99,
        lifetime: 44.99
    };
    const yearlySavings = (prices.monthly * 12 - prices.yearly).toFixed(2);
    
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
                <PageTransitionWrapper>
                    <div className="text-center pb-12">
                        <div className="flex justify-center mb-4">
                                <div className="p-3 bg-yellow-400/10 rounded-full border-2 border-yellow-400/30">
                                <Star className="h-8 w-8 text-yellow-400"/>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">Marcus Premium</h1>
                        <CardDescription className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                            Débloquez tout le potentiel de votre serveur Discord avec nos offres flexibles.
                        </CardDescription>
                         <CardDescription className="text-xl font-bold text-white mt-4 max-w-2xl mx-auto border-2 border-primary/30 bg-primary/10 p-3 rounded-lg">
                           Chaque achat vous donne droit à <span className="text-primary">3 clés d'activation</span>, valables sur 3 serveurs Discord.
                        </CardDescription>
                    </div>
                
                    <Tabs defaultValue="yearly" className="w-full max-w-5xl mx-auto">
                        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                            <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                            <TabsTrigger value="yearly" className="relative">
                                Annuel
                                <Badge className="absolute -top-2 -right-4 bg-primary text-primary-foreground border-none">Économisez !</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="lifetime">À vie</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-8">
                             <TabsContent value="monthly" className="mt-0">
                                <PricingCard plan="Mensuel" price={`${prices.monthly.toFixed(2)}€`} period="/mois">
                                    <Button size="lg" className="w-full h-12 text-lg mt-6">Acheter</Button>
                                </PricingCard>
                            </TabsContent>
                            <TabsContent value="yearly" className="mt-0">
                                <PricingCard plan="Annuel" price={`${prices.yearly.toFixed(2)}€`} period="/an" description={`Économisez ${yearlySavings}€ par rapport à l'offre mensuelle !`} isBestValue>
                                    <Button size="lg" className="w-full h-12 text-lg mt-6">Acheter</Button>
                                </PricingCard>
                            </TabsContent>
                            <TabsContent value="lifetime" className="mt-0">
                                 <PricingCard plan="À vie" price={`${prices.lifetime.toFixed(2)}€`} period="paiement unique">
                                    <Button size="lg" className="w-full h-12 text-lg mt-6">Acheter</Button>
                                </PricingCard>
                            </TabsContent>
                        </div>
                    </Tabs>
                    
                    <div className="w-full max-w-4xl mt-12 mx-auto">
                        <PremiumActivationDialog>
                            <Button size="lg" variant="secondary" className="w-full h-12 text-md">
                                <KeyRound className="mr-2"/>
                                J'ai déjà une clé d'activation
                            </Button>
                        </PremiumActivationDialog>
                    </div>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}

