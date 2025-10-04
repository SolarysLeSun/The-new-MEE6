
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Hammer, ShieldCheck, Sparkles, Server, MessageSquare, Award, ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import RippleGrid from '@/components/ripple-grid';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
        <CardHeader>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default function PresentationPage() {
    const discordInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    const supportServerUrl = "https://discord.gg/WSpz7FqFsC";

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
            
            <main className="relative z-10 container mx-auto px-4 py-16 sm:py-24 text-center">
                 <PageTransitionWrapper>
                    <Badge variant="outline" className="mb-4 border-primary/50 text-primary">Créé par Forgenet.fr</Badge>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white">
                        Le Bot Discord Ultime, <br/>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-400 to-primary">
                            Propulsé par l'IA
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
                        Marcus est une solution tout-en-un pour la modération, la sécurité, l'automatisation et l'animation de votre serveur, avec des fonctionnalités IA de pointe pour une gestion intelligente.
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                        <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="w-full sm:w-auto text-lg py-7 px-8 bg-primary hover:bg-primary/90 transition-transform duration-200 hover:scale-105">
                                Ajouter Marcus
                                <ArrowRight className="ml-2"/>
                            </Button>
                        </a>
                        <Link href="/dashboard">
                             <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg py-7 px-8">
                                <LayoutDashboard className="mr-2"/>
                                Accéder au Panel
                            </Button>
                        </Link>
                        <a href={supportServerUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg py-7 px-8">
                                Rejoindre le support
                            </Button>
                        </a>
                    </div>

                    <div className="mt-8 text-sm text-muted-foreground">
                        Une fois le bot sur votre serveur, utilisez la commande <code className="bg-muted px-1.5 py-1 rounded-md text-foreground">/login</code> pour accéder à votre panel.
                    </div>
                </PageTransitionWrapper>
            </main>

            <section className="relative z-10 container mx-auto px-4 pb-24">
                 <PageTransitionWrapper>
                    <h2 className="text-3xl font-bold text-center mb-12">Un Bot, Toutes les Fonctionnalités</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard icon={Hammer} title="Modération Complète" description="Des commandes de modération robustes aux sanctions automatiques, gardez le contrôle total sur votre communauté."/>
                        <FeatureCard icon={ShieldCheck} title="Sécurité Avancée" description="Protégez votre serveur avec des modules anti-raid, anti-bot, captcha, et des filtres de liens et d'images IA."/>
                        <FeatureCard icon={Bot} title="Automatisation Intelligente" description="Gagnez du temps avec les autoroles, les messages de bienvenue, la gestion de salons privés et bien plus."/>
                        <FeatureCard icon={Award} title="Système de Niveaux" description="Récompensez l'activité de vos membres (messages, vocal, réactions) avec un système d'XP et de rôles-récompenses."/>
                        <FeatureCard icon={MessageSquare} title="Assistant Communautaire IA" description="L'IA répond automatiquement aux questions fréquentes des membres en se basant sur votre propre base de connaissances."/>
                        <FeatureCard icon={Sparkles} title="Outils IA Créatifs" description="L'IA vous assiste pour créer des annonces, des règles, des images, et même la structure de votre serveur."/>
                    </div>
                </PageTransitionWrapper>
            </section>
             <footer className="relative z-10 container mx-auto px-4 py-8 border-t border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Marcus Bot, développé par Forgenet. Tous droits réservés.</p>
                    <div className="flex gap-4 mt-4 sm:mt-0">
                        <Link href="/mentions-legales#contact" className="hover:text-white transition-colors">Contact</Link>
                        <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link>
                        <Link href="/conditions-utilisation" className="hover:text-white transition-colors">Conditions d'Utilisation</Link>
                         <Link href="/status" className="hover:text-white transition-colors">Statut</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
