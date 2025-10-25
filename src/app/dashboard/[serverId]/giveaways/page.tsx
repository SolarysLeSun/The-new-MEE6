
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Gift, Trophy } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GiveawaysPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gift /> Giveaways (Concours)
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Organisez des concours et des tirages au sort pour votre communauté.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de conception</AlertTitle>
        <AlertDescription>
          Ce module est en cours de développement. Il vous permettra bientôt de créer des concours avec des conditions de participation, des durées et des tirages au sort automatiques.
        </AlertDescription>
      </Alert>

      <div className="pointer-events-none blur-sm grayscale opacity-50">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau Giveaway</CardTitle>
            <CardDescription>
              Aperçu de l'interface de création de concours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Prix à gagner</label>
                <input className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ex: Un jeu Steam, Un rôle VIP..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de gagnants</label>
                <input type="number" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="1" />
              </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Conditions de participation</label>
                <div className="p-4 border rounded-lg flex items-center justify-between">
                    <p>Niveau 5 minimum</p>
                    <button className="text-xs text-muted-foreground">Modifier</button>
                </div>
            </div>
             <div className="flex justify-end">
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold">Lancer le Giveaway</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransitionWrapper>
  );
}
