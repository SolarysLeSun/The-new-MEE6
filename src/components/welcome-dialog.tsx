
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

export function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasBeenShown = localStorage.getItem('marcus_welcome_shown');
    if (!hasBeenShown) {
      setIsOpen(true);
      localStorage.setItem('marcus_welcome_shown', 'true');
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">🎉 Bienvenue sur le Panel Marcus ! 🎉</DialogTitle>
          <DialogDescription className="text-base py-4 space-y-2">
            <p>
              Ceci est votre centre de commande pour configurer chaque aspect du bot.
            </p>
            <p>
                <strong>Pour commencer :</strong> Parcourez les modules sur la gauche pour découvrir et activer les fonctionnalités.
            </p>
             <p className="text-sm text-muted-foreground">
                Astuce : Utilisez <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>K</kbd> (ou Ctrl+K) pour rechercher rapidement une fonctionnalité.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Commencer l'exploration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
