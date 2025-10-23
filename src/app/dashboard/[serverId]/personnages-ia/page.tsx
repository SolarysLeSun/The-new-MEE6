

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wrench, Users, MessageCircle, BrainCircuit } from 'lucide-react';
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PersonasPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Personnages IA (Obsolète)</h1>
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Ce module a été remplacé et amélioré.
        </p>
      </div>
      
      <Separator />
      
       <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Module Remplacé</AlertTitle>
        <AlertDescription>
          Toutes les fonctionnalités de création de personnage et de personnalité ont été intégrées dans le module **Agent Conversationnel**. C'est là que vous pouvez maintenant activer le "Mode Humain" pour donner vie à une IA unique sur votre serveur.
            <div className="mt-4">
                <Link href="./agent-conversationnel">
                    <Button variant="outline">
                        <BrainCircuit className="mr-2"/>
                        Aller à l'Agent Conversationnel
                    </Button>
                </Link>
            </div>
        </AlertDescription>
      </Alert>


      <div className="pointer-events-none blur-sm grayscale opacity-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
                <h2 className="text-xl font-bold">Ancienne Interface</h2>
            </div>
        </div>
        <Separator className="my-4"/>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Exemple de Personnage</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Les personnages que vous avez créés apparaîtront ici.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </PageTransitionWrapper>
  );
}
