
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { getAiSuggestions, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Bot, Hammer, MessageSquare } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { Separator } from '@/components/ui/separator';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Génération en cours...' : 'Obtenir les suggestions'}
    </Button>
  );
}

export default function AiSuggestionsPage() {
  const initialState: FormState = {
    data: null,
    error: null,
    success: false,
  };
  const [state, formAction] = useFormState(getAiSuggestions, initialState);

  return (
    <PageTransitionWrapper className="space-y-8 max-w-4xl">
       <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="text-primary"/>
                Assistant de Configuration IA
            </h1>
            <p className="text-muted-foreground mt-2">
            Laissez l'IA vous proposer une configuration de base optimale en fonction des caractéristiques de votre serveur.
            </p>
        </div>
        <Separator />
        <GlobalAiStatusAlert/>
      <Card>
        <form action={formAction}>
          <CardHeader>
            <CardTitle>Décrivez votre serveur</CardTitle>
            <CardDescription>
              Fournissez quelques détails pour que l'IA puisse générer des suggestions pertinentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="server-size">Taille du serveur</Label>
              <Select name="serverSize" defaultValue="medium" required>
                <SelectTrigger id="server-size">
                  <SelectValue placeholder="Sélectionnez une taille" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petit (&lt;100 membres)</SelectItem>
                  <SelectItem value="medium">Moyen (100-1,000 membres)</SelectItem>
                  <SelectItem value="large">Grand (&gt;1,000 membres)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-activity">Activité du serveur</Label>
              <Select name="serverActivity" defaultValue="medium" required>
                <SelectTrigger id="server-activity">
                  <SelectValue placeholder="Sélectionnez une activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="community-type">Type de communauté</Label>
              <Select name="communityType" defaultValue="gaming" required>
                <SelectTrigger id="community-type">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="educational">Éducatif</SelectItem>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="hobby">Hobby / Intérêt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      {state.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{state.error}</p>
          </CardContent>
        </Card>
      )}

      {state.success && state.data && (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Hammer/>Suggestions de Modération</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{state.data.moderationSettings}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare/>Suggestion de Message de Bienvenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{state.data.welcomeMessage}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot/>Suggestions d'Auto-Modération</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{state.data.autoModerationRules}</p>
                </CardContent>
            </Card>
        </div>
      )}
    </PageTransitionWrapper>
  );
}
