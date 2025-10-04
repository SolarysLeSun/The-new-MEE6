
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Server, Bot, LocateFixed } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const adminTools = [
    {
        name: '/purge-roles',
        icon: Bot,
        description: 'Supprime tous les rôles du serveur qui ne sont assignés à aucun membre. Une confirmation est demandée avant toute action.'
    },
    {
        name: '/ghostping-locate',
        icon: LocateFixed,
        description: 'Scanne les messages récemment supprimés dans un salon pour y trouver des mentions d\'utilisateurs ou de rôles qui ont été effacées.'
    },
    {
        name: '/server-clone',
        icon: Server,
        description: 'Permet de cloner la structure d\'un serveur (salons, rôles). Nécessite un bot partenaire dédié pour fonctionner.'
    }
];

export default function AdministrationPage() {
  return (
    <PageTransitionWrapper className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield /> Outils d'Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Commandes avancées pour la maintenance et la gestion de votre serveur. À utiliser avec précaution.
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 gap-6">
        {adminTools.map((tool) => (
            <Card key={tool.name}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <tool.icon className="w-6 h-6 text-primary"/>
                        <span>{tool.name}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>{tool.description}</CardDescription>
                </CardContent>
            </Card>
        ))}
      </div>
    </PageTransitionWrapper>
  );
}
