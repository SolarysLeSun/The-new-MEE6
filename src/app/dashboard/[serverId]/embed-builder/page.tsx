
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, PencilRuler, Sparkles } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function EmbedBuilderPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PencilRuler />
            Constructeur d'Embeds
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez des messages Discord riches et personnalisés facilement, avec l'aide de l'IA.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de développement</AlertTitle>
        <AlertDescription>
          Ce module est en cours de conception pour vous offrir la meilleure expérience de création d'embeds possible. Il sera bientôt disponible !
        </AlertDescription>
      </Alert>

      <div className="pointer-events-none blur-sm grayscale opacity-50 space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>Contenu de l'Embed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input placeholder="Titre de l'embed" />
                        <Input type="color" defaultValue="#5865F2" />
                    </div>
                    <Textarea placeholder="Description... Vous pouvez utiliser le Markdown de Discord." rows={6} />
                    <Button variant="outline" size="sm"><Sparkles className="mr-2 h-4 w-4" />Rédiger avec l'IA</Button>
                </CardContent>
           </Card>
           <div className="text-center">
                <Button>Envoyer l'Embed</Button>
           </div>
      </div>

    </PageTransitionWrapper>
  );
}
