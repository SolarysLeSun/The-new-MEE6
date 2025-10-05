
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookUser, Clapperboard, Lightbulb } from "lucide-react";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { Separator } from "@/components/ui/separator";

export default function CreditsPage() {
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

      <main className="relative z-10 container mx-auto px-4 py-24 sm:py-32">
        <Card className="max-w-3xl mx-auto bg-card/60 backdrop-blur-sm border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold">
              Crédits & Remerciements
            </CardTitle>
            <CardDescription>
                Les personnes et les idées derrière le projet Marcus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4 text-center">
                <div className="inline-block rounded-lg bg-primary/10 p-4">
                    <BookUser className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-white">Développement Principal</h3>
                <p className="text-lg text-muted-foreground">Nightfury</p>
            </div>
             <div className="space-y-4 text-center">
                <div className="inline-block rounded-lg bg-primary/10 p-4">
                    <Lightbulb className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-white">Idée Originale</h3>
                <p className="text-lg text-muted-foreground">Matchoking & La ruche des abeilles</p>
            </div>

            <Separator/>
            
             <div className="space-y-4 text-center pt-4">
                 <div className="inline-block rounded-lg bg-yellow-400/10 p-4">
                    <Clapperboard className="w-12 h-12 text-yellow-400" />
                </div>
                <blockquote className="border-l-4 border-yellow-400/50 pl-4 italic text-lg text-white/90 max-w-lg mx-auto">
                    Vous savez, moi je ne crois pas qu’il y ait de bonne ou de mauvaise situation. Moi, si je devais résumer ma vie aujourd’hui avec vous, je dirais que c’est d’abord des rencontres...
                </blockquote>
                 <p className="text-sm text-muted-foreground">Otis - Astérix et Obélix : Mission Cléopâtre</p>
            </div>

            <div className="text-center pt-8">
                <Link href="/">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2"/>
                        Retour à l'accueil
                    </Button>
                </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageTransitionWrapper>
  );
}
