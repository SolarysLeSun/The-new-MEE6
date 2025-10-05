
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Megaphone, Shield, Code, Handshake, Users } from "lucide-react";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { Separator } from "@/components/ui/separator";

const roles = [
    {
        icon: Megaphone,
        title: "Ambassadeur / Partenaire",
        description: "Aidez-nous à faire connaître Marcus ! Si vous avez une communauté, un serveur ou une chaîne, devenez partenaire pour promouvoir le bot.",
        qualities: ["Bonne communication", "Réseau existant", "Enthousiasme"]
    },
    {
        icon: Shield,
        title: "Modérateur Discord",
        description: "Rejoignez l'équipe de modération de notre serveur de support officiel pour aider les nouveaux utilisateurs et maintenir une ambiance saine.",
        qualities: ["Patient", "Pédagogue", "Disponible", "Bonne connaissance de Discord"]
    },
    {
        icon: Code,
        title: "Testeur / Développeur",
        description: "Vous aimez trouver des bugs ou vous savez coder ? Aidez-nous à améliorer Marcus, à tester les nouvelles fonctionnalités en avant-première et à proposer vos propres idées.",
        qualities: ["Curieux", "Rigoureux", "Esprit logique", "Connaissances en JS/TS (un plus)"]
    }
]

export default function RecrutementPage() {
  const supportServerUrl = "https://discord.gg/WSpz7FqFsC";
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
        <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-fit bg-primary/10 p-4 rounded-full border border-primary/20">
                <Users className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-4xl font-bold pt-4">
              Rejoignez l'Aventure Marcus
            </CardTitle>
            <CardDescription className="text-lg">
                Nous recherchons des passionnés pour nous aider à grandir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.title} className="p-6 border border-white/10 rounded-lg bg-card/50 flex flex-col items-center text-center">
                        <role.icon className="w-10 h-10 text-primary mb-4" />
                        <h3 className="text-xl font-semibold text-white">{role.title}</h3>
                        <p className="text-muted-foreground mt-2 flex-grow">{role.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {role.qualities.map(q => <div key={q} className="text-xs bg-secondary px-2 py-1 rounded-full">{q}</div>)}
                        </div>
                    </div>
                ))}
            </div>
            <Separator />
            <div className="text-center space-y-4 rounded-lg border border-primary/20 bg-primary/10 p-6">
                 <h2 className="text-2xl font-semibold text-white flex items-center justify-center gap-2">
                    <Handshake/> Comment Postuler ?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    Le processus est simple ! Rejoignez notre serveur Discord officiel, et ouvrez un ticket dans le salon dédié au recrutement. Présentez-vous et expliquez-nous pourquoi vous seriez un bon ajout à l'équipe !
                </p>
                 <a href={supportServerUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                        Rejoindre le Serveur & Postuler
                    </Button>
                </a>
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

