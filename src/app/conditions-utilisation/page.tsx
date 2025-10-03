
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";

export default function ConditionsUtilisationPage() {
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
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-center">
              Conditions Générales d'Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                1. Acceptation des Conditions
              </h2>
              <p>
                En ajoutant le bot Marcus à votre serveur Discord, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'êtes pas d'accord avec ces termes, vous ne devez pas utiliser le bot.
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                2. Abus et Utilisation Interdite
              </h2>
              <p>
                Il est formellement interdit d'abuser des fonctionnalités du bot, et notamment de ses capacités d'Intelligence Artificielle. Cela inclut, sans s'y limiter, le spam de commandes, les tentatives de contournement des limitations, la génération de contenu illégal ou inapproprié, ou toute utilisation visant à nuire au bon fonctionnement du bot ou à d'autres utilisateurs.
              </p>
               <p>
                Toute violation constatée pourra entraîner une interdiction d'utilisation du bot pour le serveur concerné, sans préavis.
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                3. Limitation de Responsabilité et Perte de Données
              </h2>
              <p>
                Marcus est fourni "en l'état". Bien que nous nous efforcions de garantir une disponibilité et une fiabilité maximales, des opérations de maintenance ou des problèmes techniques imprévus peuvent survenir.
              </p>
              <p>
                En cas de problème majeur, il est possible que nous soyons contraints d'effectuer des restaurations ("rollbacks") de la base de données. Ces opérations peuvent entraîner la perte de configurations récentes ou d'autres données stockées par le bot. En utilisant Marcus, vous reconnaissez et acceptez ce risque. Les créateurs ne pourront être tenus pour responsables de la perte de données résultant de telles opérations.
              </p>
            </div>
             <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                4. Modification des Conditions
              </h2>
              <p>
                Nous nous réservons le droit de modifier ces CGU à tout moment. Les utilisateurs seront informés des changements importants via le serveur Discord de support.
              </p>
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
