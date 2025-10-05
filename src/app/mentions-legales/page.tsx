
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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
              Mentions Légales & Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                1. Propriété Intellectuelle
              </h2>
              <p>
                Le bot Discord "Marcus", son code source, son panel de gestion web, ainsi que tous les éléments graphiques et textuels associés sont la propriété intellectuelle exclusive de son créateur, associé à Forgenet.fr.
              </p>
              <p>
                Ce projet, bien qu'étant une œuvre originale, n'est pas formellement enregistré auprès d'une organisation de protection des droits d'auteur. Néanmoins, il est protégé par le droit d'auteur inhérent à toute création de l'esprit, conformément à la législation en vigueur.
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                2. Interdiction d'Utilisation Commerciale
              </h2>
              <p>
                Toute revente, appropriation, distribution à but lucratif, ou toute autre forme d'utilisation commerciale du code source du bot Marcus ou de son panel est strictement interdite sans une autorisation écrite et explicite du créateur. L'utilisation du bot est réservée à la gestion de serveurs Discord et ne doit en aucun cas générer de bénéfice direct ou indirect pour des tiers non autorisés.
              </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-2xl font-semibold text-white hover:no-underline">
                  3. Gestion des Données et Confidentialité
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                      <h3 className="font-semibold text-white">Traitement des Données</h3>
                      <p>Pour fonctionner, Marcus doit analyser le contenu des messages en temps réel pour des fonctionnalités telles que l'auto-modération ou les commandes. Ce traitement est automatisé et temporaire. <strong>Aucun contenu de message utilisateur n'est stocké de manière persistante par Marcus.</strong></p>
                  </div>
                  <div className="space-y-2">
                      <h3 className="font-semibold text-white">Stockage des Données</h3>
                      <p>Les seules informations que nous stockons sont les configurations que vous définissez explicitement via le panel. Celles-ci se limitent principalement à des identifiants (IDs) fournis par Discord (ID de salon, de rôle, etc.) nécessaires au bon fonctionnement des modules. Aucune donnée personnelle sensible (e-mail, mot de passe, etc.) n'est collectée ou stockée.</p>
                  </div>
                   <div className="space-y-2">
                      <h3 className="font-semibold text-white">Suppression des Données</h3>
                      <p>Vous avez le contrôle total sur vos données de configuration. Vous pouvez modifier ou supprimer manuellement toutes les informations que vous avez fournies directement depuis le panel de configuration de votre serveur.</p>
                  </div>
                   <div className="space-y-2">
                      <h3 className="font-semibold text-white">Services Tiers</h3>
                      <p>Pour fonctionner, Marcus s'appuie sur les services tiers suivants :</p>
                      <ul className="list-disc list-inside space-y-1 pl-4">
                          <li><strong>Discord :</strong> Le bot est une application Discord et interagit avec son API.</li>
                          <li><strong>Google Cloud :</strong> L'infrastructure du bot (hébergement) et la puissance de calcul pour les fonctionnalités IA sont fournies par Google.</li>
                           <li><strong>PayPal :</strong> Pour la gestion des paiements de l'offre Premium. Marcus n'est pas responsable des pratiques de PayPal. Pour plus d'informations, veuillez consulter leurs propres conditions d'utilisation.</li>
                      </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="space-y-2" id="contact">
              <h2 className="text-2xl font-semibold text-white">
                4. Contact
              </h2>
              <p>Pour toute demande, veuillez utiliser l'adresse e-mail appropriée :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>
                      <strong>Demandes Générales & Partenariats :</strong>{" "}
                      <a href="mailto:contact@marcusbot.fr" className="text-primary hover:underline">contact@marcusbot.fr</a>
                  </li>
                  <li>
                      <strong>Support Technique & Infrastructure (Forge Network) :</strong>{" "}
                      <a href="mailto:contact@forgenet.fr" className="text-primary hover:underline">contact@forgenet.fr</a>
                  </li>
                   <li>
                      <strong>Développement & Questions Techniques (NightFury) :</strong>{" "}
                      <a href="mailto:nightfury@nationquest.fr" className="text-primary hover:underline">nightfury@nationquest.fr</a>
                  </li>
                  <li>
                      <strong>Projet "Marcus Extend" (NationQuest) :</strong>{" "}
                      <a href="mailto:marcus@nationquest.fr" className="text-primary hover:underline">marcus@nationquest.fr</a>
                  </li>
              </ul>
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
