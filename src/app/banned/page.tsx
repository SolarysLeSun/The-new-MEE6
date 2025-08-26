
'use client';

import FuzzyText from "@/components/fuzzy-text";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function BannedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <ShieldAlert className="w-24 h-24 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mt-4">Accès Refusé</h1>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        Vous avez été banni de l'accès au panel de configuration pour ce serveur. Veuillez contacter un administrateur pour plus d'informations.
      </p>
      <Link href="/dashboard">
        <Button variant="outline">Retourner à la sélection des serveurs</Button>
      </Link>
    </div>
  );
}
