
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export default function MentionsLegalesPage() {
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
              Mentions Légales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                1. Propriété Intellectuelle
              </h2>
              <p>
                Le bot Discord "Marcus", son code source, son panel de gestion web, ainsi que tous les éléments graphiques et textuels associés sont la propriété intellectuelle de <strong>ForgeNet Collective</strong>. Copyright © 2025.
              </p>
               <p>
                Ce logiciel et sa documentation sont fournis à des fins éducatives et de contribution communautaire uniquement. Vous pouvez consulter le code et suggérer des améliorations via les canaux appropriés, mais il est strictement interdit de copier, modifier, distribuer, héberger ou utiliser ce logiciel ou ses composants dans tout projet public ou privé sans une autorisation écrite explicite de ForgeNet.
              </p>
            </div>
            <div className="space-y-2" id="contact">
              <h2 className="text-2xl font-semibold text-white">
                2. Contact
              </h2>
              <p>Pour toute demande, veuillez utiliser l'adresse e-mail appropriée :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>
                      <strong>Demandes Générales & Partenariats :</strong>{" "}
                      <a href="mailto:contact@marcusbot.fr" className="text-primary hover:underline">contact@marcusbot.fr</a>
                  </li>
                  <li>
                      <strong>Support Technique & Infrastructure (ForgeNet) :</strong>{" "}
                      <a href="mailto:contact@forgenet.fr" className="text-primary hover:underline">contact@forgenet.fr</a>
                  </li>
                   <li>
                      <strong>Développement & Questions Techniques (NightFury) :</strong>{" "}
                      <a href="mailto:nightfury@nationquest.fr" className="text-primary hover:underline">nightfury@nationquest.fr</a>
                  </li>
              </ul>
            </div>
             <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">3. Gestion des Données et Services Tiers</h2>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Cliquez ici pour voir notre politique de données</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                           <p>
                                <strong>Traitement des données :</strong> Pour fonctionner, Marcus doit analyser le contenu de certains messages (par exemple, pour l'auto-modération ou les commandes IA). Ce traitement est effectué en temps réel et **aucune de ces données de conversation n'est stockée** dans notre base de données.
                            </p>
                            <p>
                                <strong>Données stockées :</strong> Les seules informations que nous conservons sont celles que vous configurez explicitement via le panel de gestion. Il s'agit principalement d'identifiants (IDs de salons, de rôles, de membres) fournis par l'API Discord, qui sont essentiels pour le fonctionnement des modules que vous activez. Aucune donnée personnelle en dehors de ces identifiants fonctionnels n'est stockée.
                            </p>
                            <p>
                                <strong>Suppression des données :</strong> Vous avez le contrôle total. Vous pouvez à tout moment modifier ou supprimer les configurations depuis le panel. En supprimant une configuration (par exemple, en désactivant un module ou en retirant un rôle d'une liste), vous supprimez de fait les données associées de notre base de données.
                            </p>
                            <p>
                                <strong>Services tiers :</strong> Marcus repose sur des services externes pour fonctionner.
                                <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                                    <li><strong>Discord :</strong> Notre service est un bot Discord, il est donc intrinsèquement lié à l'API de Discord et à ses conditions d'utilisation.</li>
                                    <li><strong>Google Cloud :</strong> L'ensemble de notre infrastructure (hébergement du bot, panel web) et nos fonctionnalités IA (Genkit) sont propulsés par les services de Google Cloud Platform.</li>
                                    <li><strong>PayPal / Stripe :</strong> Pour la vente de nos offres Premium, nous utilisons des services de paiement sécurisés. Nous ne stockons aucune information de paiement.</li>
                                </ul>
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
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
