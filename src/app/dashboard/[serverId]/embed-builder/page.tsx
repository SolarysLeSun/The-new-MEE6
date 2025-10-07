
'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, PencilRuler, Sparkles, Eye } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const exampleJson = `{
  "content": "Bienvenue sur le serveur !",
  "embeds": [
    {
      "title": "Titre de l'Embed",
      "description": "Ceci est un exemple de description. Vous pouvez utiliser le **Markdown** de Discord.",
      "color": 5793266,
      "fields": [
        {
          "name": "Champ 1",
          "value": "Contenu du champ 1",
          "inline": true
        },
        {
          "name": "Champ 2",
          "value": "Contenu du champ 2",
          "inline": true
        }
      ],
      "footer": {
        "text": "Pied de page de l'embed"
      }
    }
  ]
}`;

export default function EmbedBuilderPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl">
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
           <div className="grid md:grid-cols-2 gap-6">
                {/* JSON Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Éditeur JSON de l'Embed</CardTitle>
                        <CardDescription>Modifiez directement le code JSON de l'embed ci-dessous.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            defaultValue={exampleJson}
                            rows={20}
                            className="font-mono text-xs"
                        />
                         <Button variant="outline" size="sm" className="mt-4 w-full">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Modifier ou corriger avec l'IA
                        </Button>
                    </CardContent>
                </Card>
                 {/* Live Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Eye/>Aperçu en Direct</CardTitle>
                        <CardDescription>L'embed apparaîtra ici tel qu'il sera sur Discord.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-secondary p-4 rounded-lg space-y-2">
                            <p className="text-white">Bienvenue sur le serveur !</p>
                            <div className="bg-[#2B2D31] p-4 rounded border-l-4" style={{borderColor: '#5865F2'}}>
                                <h3 className="font-bold text-white">Titre de l'Embed</h3>
                                <p className="text-sm text-gray-300">Ceci est un exemple de description. Vous pouvez utiliser le <strong>Markdown</strong> de Discord.</p>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <h4 className="font-semibold text-sm text-gray-200">Champ 1</h4>
                                        <p className="text-sm text-gray-400">Contenu du champ 1</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-gray-200">Champ 2</h4>
                                        <p className="text-sm text-gray-400">Contenu du champ 2</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-4">Pied de page de l'embed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
           </div>
           <div className="text-center">
                <Button size="lg">Envoyer l'Embed (désactivé)</Button>
           </div>
      </div>

    </PageTransitionWrapper>
  );
}
