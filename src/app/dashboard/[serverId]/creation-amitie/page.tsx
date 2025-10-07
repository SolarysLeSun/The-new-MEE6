
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Users } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

export default function CreationAmitiePage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Création d'Amitié
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Détectez et visualisez les affinités entre les membres de votre communauté.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de conception</AlertTitle>
        <AlertDescription>
          Ce module est une idée innovante mais techniquement très complexe à mettre en place de manière performante. Il nécessite une surveillance et une analyse continue de toutes les interactions. Nous étudions la meilleure approche pour le réaliser.
        </AlertDescription>
      </Alert>

       <div className="pointer-events-none blur-sm grayscale opacity-50">
           <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Classement des amitiés</h3>
                <p className="text-muted-foreground mt-2">
                    Un classement des duos les plus proches sur le serveur apparaîtra ici.
                </p>
            </div>
      </div>

    </PageTransitionWrapper>
  );
}
