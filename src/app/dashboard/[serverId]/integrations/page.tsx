
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Rss, Wrench } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function IntegrationsPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Intégrations & Services Externes
        </h1>
        <p className="text-muted-foreground mt-2">
          Connectez Marcus à d'autres services pour automatiser encore plus votre serveur.
        </p>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss />
            Flux RSS
          </CardTitle>
          <CardDescription>
            Publiez automatiquement les nouvelles entrées d'un flux RSS dans un salon de votre choix.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert>
                <Wrench className="h-4 w-4" />
                <AlertTitle>Fonctionnalité en cours de développement</AlertTitle>
                <AlertDescription>
                Ce module vous permettra bientôt de configurer des flux RSS pour annoncer des mises à jour de jeux, des articles de blog, ou toute autre actualité directement sur votre serveur.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
      
    </PageTransitionWrapper>
  );
}
