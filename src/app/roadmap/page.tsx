
'use client';

import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RippleGrid from '@/components/ripple-grid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { GitBranch, ListTodo, Sparkles, Rocket } from 'lucide-react';
import Link from 'next/link';

const roadmapItems = [
    { title: "Commandes Personnalisées", description: "Interface no-code pour créer vos propres commandes avec des déclencheurs et des actions.", icon: Sparkles, status: "En conception" },
    { title: "Système de 'Création d'Amitié'", description: "Analyse des interactions pour visualiser les affinités entre membres.", icon: GitBranch, status: "En recherche" },
    { title: "Traduction Vocale en Temps Réel", description: "Traduction instantanée des conversations vocales entre plusieurs langues.", icon: Sparkles, status: "En recherche" },
    { title: "Générateur de Serveur IA v2", description: "Amélioration de l'outil de création et d'édition de serveur.", icon: ListTodo, status: "Prévu" },
    { title: "Tableau de Bord des Statistiques", description: "Visualisation de l'activité du serveur et de l'utilisation du bot.", icon: ListTodo, status: "Prévu" },
];

export default function RoadmapPage() {

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
                    <div className="text-center mb-16">
                         <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-full border-2 border-primary/30">
                                <Rocket className="h-8 w-8 text-primary"/>
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">Feuille de Route</h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                            Un aperçu des prochaines grandes fonctionnalités et améliorations prévues pour Marcus.
                        </p>
                    </div>

                    <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle>Fonctionnalités à venir</CardTitle>
                            <CardDescription>Cette liste est sujette à changement et les priorités peuvent évoluer.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {roadmapItems.map((item, index) => (
                                <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <item.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{item.title}</h3>
                                        <p className="text-muted-foreground text-sm">{item.description}</p>
                                    </div>
                                    <div className="ml-auto text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-full">{item.status}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}

