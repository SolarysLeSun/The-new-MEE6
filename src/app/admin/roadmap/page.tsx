'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RippleGrid from '@/components/ripple-grid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { CheckCircle, GitBranch, ListTodo, Loader2, Lock, Sparkles, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const roadmapItems = [
    { title: "Commandes Personnalisées", description: "Interface no-code pour créer vos propres commandes avec des déclencheurs et des actions.", icon: Sparkles, status: "En conception" },
    { title: "Système de 'Création d'Amitié'", description: "Analyse des interactions pour visualiser les affinités entre membres.", icon: GitBranch, status: "En recherche" },
    { title: "Traduction Vocale en Temps Réel", description: "Traduction instantanée des conversations vocales entre plusieurs langues.", icon: Sparkles, status: "En recherche" },
    { title: "Générateur de Serveur IA v2", description: "Amélioration de l'outil de création et d'édition de serveur.", icon: ListTodo, status: "Prévu" },
    { title: "Tableau de Bord des Statistiques", description: "Visualisation de l'activité du serveur et de l'utilisation du bot.", icon: ListTodo, status: "Prévu" },
];

function AdminPanel() {
    const { toast } = useToast();
    const [isRestarting, setIsRestarting] = useState(false);

    const handleRestart = async () => {
        setIsRestarting(true);
        try {
            const response = await fetch(`${API_URL}/restart-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'cresus' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "La commande de redémarrage a échoué.");
            }

            toast({
                title: "Redémarrage en cours...",
                description: "La commande de redémarrage a été envoyée au bot. Veuillez patienter une minute.",
            });
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsRestarting(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                <CardHeader>
                    <CardTitle>Panneau de Gestion</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRestart} disabled={isRestarting} variant="destructive">
                        {isRestarting ? <Loader2 className="animate-spin mr-2" /> : null}
                        Redémarrer le Bot
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                <CardHeader>
                    <CardTitle>Feuille de Route (Roadmap)</CardTitle>
                    <CardDescription>Aperçu des fonctionnalités prévues pour les prochaines mises à jour.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {roadmapItems.map((item, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <item.icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">{item.title}</h3>
                                <p className="text-muted-foreground text-sm">{item.description}</p>
                            </div>
                            <div className="ml-auto text-xs font-semibold text-muted-foreground whitespace-nowrap">{item.status}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

export default function RoadmapPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'cresus') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Mot de passe incorrect.');
        }
    };

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
            <main className="relative z-10 container mx-auto px-4 py-24 sm:py-32">
                <PageTransitionWrapper>
                    {!isAuthenticated ? (
                        <div className="flex justify-center">
                            <Card className="w-full max-w-md bg-card/60 backdrop-blur-sm border-white/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lock />
                                        Accès Restreint
                                    </CardTitle>
                                    <CardDescription>
                                        Cette section est réservée à l'administration.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Mot de passe</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                        {error && <p className="text-sm text-destructive">{error}</p>}
                                        <Button type="submit" className="w-full">
                                            <LogIn className="mr-2" />
                                            Accéder
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <AdminPanel />
                    )}
                </PageTransitionWrapper>
            </main>
        </div>
    );
}
