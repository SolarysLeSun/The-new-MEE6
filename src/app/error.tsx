
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionnel : Log l'erreur vers un service de reporting
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mb-2">Oups ! Une Erreur est Survenue.</h1>
      <p className="text-lg text-muted-foreground max-w-lg mb-8">
        Une erreur inattendue a eu lieu. Vous pouvez essayer de recharger la page ou nous contacter sur notre serveur de support si le problème persiste.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} size="lg">
          <RefreshCw className="mr-2" />
          Réessayer
        </Button>
        <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">
                Retour au Panel
            </Link>
        </Button>
      </div>
    </div>
  );
}
