

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeDialogProps {
    serverName?: string;
    isPremium?: boolean;
}

export function WelcomeDialog({ serverName, isPremium }: WelcomeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasBeenShown = localStorage.getItem('marcus_welcome_shown_v2');
    if (!hasBeenShown) {
      setIsOpen(true);
      localStorage.setItem('marcus_welcome_shown_v2', 'true');
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">🎉 Bienvenue sur le Panel de {serverName || "Marcus"} ! 🎉</DialogTitle>
          <DialogDescription asChild>
            <div className="text-base py-4 space-y-3 text-muted-foreground">
                <p>Ceci est votre centre de commande pour configurer chaque aspect du bot.</p>
                
                {isPremium && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <h3 className="font-bold text-yellow-300 flex items-center gap-2"><Sparkles/> Statut Premium Détecté</h3>
                        <p className="text-sm">Merci pour votre soutien ! Vous avez accès à toutes les fonctionnalités IA. Nous vous recommandons de commencer par configurer l'**Agent Conversationnel** !</p>
                    </div>
                )}
                
                <p><strong>Pour commencer :</strong> Parcourez les modules sur la gauche pour découvrir et activer les fonctionnalités.</p>
                <p className="text-sm">
                    Astuce : Utilisez <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>K</kbd> (ou Ctrl+K) pour rechercher rapidement une fonctionnalité.
                </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between items-center gap-4">
             {isPremium && (
                 <Link href="agent-conversationnel">
                    <Button variant="outline">
                        Configurer l'Agent IA
                        <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                </Link>
            )}
            <Button onClick={() => setIsOpen(false)} className={!isPremium ? "w-full" : ""}>Commencer l'exploration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
