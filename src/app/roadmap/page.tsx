
'use client';

import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RippleGrid from '@/components/ripple-grid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { GitBranch, ListTodo, Sparkles, Rocket, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface RoadmapItem {
    id: string;
    title: string;
    description: string;
    icon: string;
    status: string;
}

const iconMap: { [key: string]: React.ElementType } = {
    Sparkles,
    GitBranch,
    ListTodo,
    Rocket,
};

export default function RoadmapPage() {
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                const res = await fetch(`${API_URL}/roadmap/items`);
                if (res.ok) {
                    const data = await res.json();
                    setRoadmapItems(data);
                }
            } catch (error) {
                console.error("Failed to fetch roadmap items", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRoadmap();
    }, []);

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
                             {loading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                                </div>
                            ) : (
                                roadmapItems.map((item) => {
                                const Icon = iconMap[item.icon] || Sparkles;
                                return (
                                <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{item.title}</h3>
                                        <p className="text-muted-foreground text-sm">{item.description}</p>
                                    </div>
                                    <div className="ml-auto text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-full">{item.status}</div>
                                </div>
                            )})
                            )}
                        </CardContent>
                    </Card>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}

  