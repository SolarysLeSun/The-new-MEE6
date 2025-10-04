
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, KeyRound, Star, Bot, BarChartHorizontal } from 'lucide-react';
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

const PricingCard = ({ plan, price, period, description, children, badgeText }: { plan: string, price: string, period: string, description?: string, children: React.ReactNode, badgeText?: string }) => (
    <Card className="flex flex-col bg-card/60 backdrop-blur-sm shadow-lg border-primary/20">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{plan}</CardTitle>
                {badgeText && <Badge variant="destructive" className="bg-primary border-none">{badgeText}</Badge>}
            </div>
            <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold">{price}</span>
                <span className="text-muted-foreground">{period}</span>
            </div>
             {description && <CardDescription className="pt-1 !text-green-400 font-semibold">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1">
            {children}
        </CardContent>
    </Card>
);

export default function PremiumPage() {
    const koFiUrl = 'https://ko-fi.com/M4M21555O9';
    const prices = {
        monthly: 9.99,
        yearly: 24.99,
        lifetime: 45.00
    };
    const yearlySavings = (prices.monthly * 12 - prices.yearly).toFixed(2);


    return (
        <PageTransitionWrapper className="relative min-h-screen w-full bg-background text-foreground">
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
                </div>
                
                <Tabs defaultValue="yearly" className="w-full max-w-4xl">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                        <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                        <TabsTrigger value="yearly">Annuel</TabsTrigger>
                        <TabsTrigger value="lifetime">À vie</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="monthly">
                        <PricingCard plan="Mensuel" price={`${prices.monthly.toFixed(2)}€`} period="/mois">
                             <ul className="space-y-3 text-card-foreground my-6">
                                {premiumFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <a href={koFiUrl} target='_blank' rel='noopener noreferrer' className='w-full'>
                                <Button size="lg" className="w-full h-12 text-lg">Acheter Premium</Button>
                            </a>
                        </PricingCard>
                    </TabsContent>
                    <TabsContent value="yearly">
                         <PricingCard plan="Annuel" price={`${prices.yearly.toFixed(2)}€`} period="/an" description={`Économisez ${yearlySavings}€ par an !`} badgeText="Meilleur Choix">
                             <ul className="space-y-3 text-card-foreground my-6">
                                {premiumFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <a href={koFiUrl} target='_blank' rel='noopener noreferrer' className='w-full'>
                                <Button size="lg" className="w-full h-12 text-lg">Acheter Premium</Button>
                            </a>
                        </PricingCard>
                    </TabsContent>
                    <TabsContent value="lifetime">
                         <PricingCard plan="À vie" price={`${prices.lifetime.toFixed(2)}€`} period="paiement unique" badgeText="Valeur Ultime" description="Rentabilisé en moins de 2 ans.">
                             <ul className="space-y-3 text-card-foreground my-6">
                                {premiumFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <a href={koFiUrl} target='_blank' rel='noopener noreferrer' className='w-full'>
                                <Button size="lg" className="w-full h-12 text-lg">Acheter Premium</Button>
                            </a>
                        </PricingCard>
                    </TabsContent>
                </Tabs>

                <Card className="w-full max-w-4xl mt-8 bg-card/60 backdrop-blur-sm shadow-lg border-primary/20">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot />Option Bot Personnalisé</CardTitle>
                        <CardDescription>
                            Une version privée de Marcus, hébergée pour vous, avec le nom, l'avatar et le statut de votre choix.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">+ 3€ <span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                        <p className="text-xs text-muted-foreground mt-2">
                           Cette option nécessite un abonnement actif et un contact direct avec le support pour la mise en place.
                        </p>
                    </CardContent>
                </Card>

                 <div className="w-full max-w-4xl mt-8">
                     <PremiumActivationDialog>
                        <Button size="lg" variant="secondary" className="w-full h-12 text-md">
                            <KeyRound className="mr-2"/>
                            J'ai déjà une clé d'activation
                        </Button>
                    </PremiumActivationDialog>
                 </div>
                 
                 <p className="text-xs text-center text-muted-foreground mt-8 max-w-2xl mx-auto">
                    Note: L'achat d'une offre vous donnera accès à 3 clés d'activation, vous permettant de bénéficier des avantages premium sur 3 serveurs Discord distincts. Le bouton d'achat vous redirigera vers Ko-fi.
                </p>

            </main>
        </PageTransitionWrapper>
    );
}
