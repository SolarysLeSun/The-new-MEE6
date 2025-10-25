
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Handshake, Users } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card } from '@/components/ui/card';

export default function PartnershipsPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Handshake /> Partenariats
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez des liens forts entre votre communauté et d'autres serveurs.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de conception</AlertTitle>
        <AlertDescription>
          Ce module est en cours de développement. Il vous permettra de formaliser des partenariats, de gérer des annonces croisées et de synchroniser des rôles entre serveurs. Votre patience est appréciée pendant que nous construisons cette fonctionnalité complexe.
        </AlertDescription>
      </Alert>

       <div className="pointer-events-none blur-sm grayscale opacity-50">
           <Card className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Gérez vos partenaires</h3>
                <p className="text-muted-foreground mt-2">
                    La liste de vos serveurs partenaires, les demandes envoyées et reçues apparaîtront ici.
                </p>
            </Card>
      </div>

    </PageTransitionWrapper>
  );
}
