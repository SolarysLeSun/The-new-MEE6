
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ShinyText from '@/components/ui/shiny-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';


export default function PersonasPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
                 <ShinyText text="Personnages IA" />
            </h1>
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Créez une population d'IA pour votre serveur, chacune avec sa propre personnalité, son histoire et ses relations.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Module en cours de refonte</AlertTitle>
        <AlertDescription>
          La fonctionnalité des Personnages IA est actuellement en cours d'amélioration pour vous offrir une expérience encore plus incroyable. Elle sera de retour prochainement. Merci de votre patience !
        </AlertDescription>
      </Alert>

      <div className="pointer-events-none blur-sm grayscale opacity-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
                <h2 className="text-xl font-bold">Vos Personnages IA</h2>
                <p className="text-muted-foreground">Créez et gérez des personnalités IA uniques pour votre serveur.</p>
            </div>
        </div>
        <Separator className="my-4"/>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Exemple de Personnage</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Les personnages que vous avez créés apparaîtront ici.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </PageTransitionWrapper>
  );
}
