
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, Link as LinkIcon } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PersonasPage() {
  const params = useParams();
  const serverId = params.serverId as string;

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
                 Personnages IA
            </h1>
            <Badge variant="destructive">Obsolète</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Créez une population d'IA pour votre serveur, chacune avec sa propre personnalité, son histoire et ses relations.
        </p>
      </div>
      
      <Separator />

      <Alert variant="destructive">
        <Bot className="h-4 w-4" />
        <AlertTitle>Ce module est obsolète et ne sera plus maintenu.</AlertTitle>
        <AlertDescription>
          Toutes les fonctionnalités de personnalité et de conversation ont été déplacées et améliorées dans le module **Agent Conversationnel**. Nous vous recommandons vivement de l'utiliser à la place pour une expérience plus stable et plus riche.
          <Link href={`/dashboard/${serverId}/agent-conversationnel`}>
            <Button variant="link" className="p-0 h-auto ml-2 text-destructive">
                Aller à l'Agent Conversationnel
                <LinkIcon className="ml-1 h-4 w-4"/>
            </Button>
          </Link>
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
                    <p className="text-muted-foreground">Les personnages que vous avez créés apparaîtraient ici.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </PageTransitionWrapper>
  );
}
