
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Code } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

export default function CustomCommandsPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Commandes Personnalisées
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez vos propres commandes avec des actions et des déclencheurs personnalisés.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de développement</AlertTitle>
        <AlertDescription>
          Ce module est l'une de nos priorités majeures et est en cours de conception. Il vous permettra de créer des commandes avec des déclencheurs (ex: `!macommande`) et des actions (ex: "envoyer un message", "ajouter un rôle"). Restez à l'écoute !
        </AlertDescription>
      </Alert>

       <div className="pointer-events-none blur-sm grayscale opacity-50">
           <div className="grid md:grid-cols-2 gap-6">
                <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                    <Code className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">!exemple</h3>
                    <p className="text-muted-foreground mt-2">
                        Créer une nouvelle commande en choisissant un déclencheur et des actions.
                    </p>
                </div>
                 <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                    <Code className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">/ma-slash-commande</h3>
                    <p className="text-muted-foreground mt-2">
                        Concevoir des commandes slash complexes via une interface no-code.
                    </p>
                </div>
           </div>
      </div>

    </PageTransitionWrapper>
  );
}
