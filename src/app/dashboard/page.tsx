
'use client';

import { Server } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

export default function ServerDashboardPage() {

  return (
    <PageTransitionWrapper className="flex flex-col h-full w-full items-center justify-center text-center">
        <Server className="w-16 h-16 text-muted-foreground mb-4"/>
        <h2 className="text-2xl font-bold">Bienvenue sur votre Panel</h2>
        <p className="text-muted-foreground mt-2">Veuillez sélectionner un serveur dans la barre latérale pour commencer.</p>
    </PageTransitionWrapper>
  );
}
