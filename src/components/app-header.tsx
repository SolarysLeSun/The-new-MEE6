
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronDown, LogOut, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function MarcusLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M43.7917 20.8333C45.875 18.75 48.7917 18.3333 51.2917 19.5833C53.7917 20.8333 55.4167 23.3333 55.4167 26.25V37.5C55.4167 43.3333 56.6667 45.8333 60.4167 47.9167C64.1667 50 68.75 50 72.0833 50H73.75C76.6667 50 79.1667 51.6667 80.4167 54.1667C81.6667 56.6667 81.25 59.5833 79.1667 61.6667L45.4167 95.4167C43.3333 97.5 40.4167 97.9167 37.9167 96.6667C35.4167 95.4167 33.7917 92.9167 33.7917 90V75C33.7917 69.1667 32.5417 66.6667 28.7917 64.5833C25.0417 62.5 20.4583 62.5 17.125 62.5H15.4583C12.5417 62.5 10.0417 60.8333 8.79167 58.3333C7.54167 55.8333 7.95833 52.9167 10.0417 50.8333L43.7917 20.8333Z" stroke="#FFFFFF" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M57.9167 43.75L41.6667 27.5" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


export function AppHeader() {
  const [clickCount, setClickCount] = useState(0);
  const [showMemeDialog, setShowMemeDialog] = useState(false);

  const discordInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${'${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}'}&permissions=8&scope=bot%20applications.commands`;
  const supportServerUrl = "https://discord.gg/WSpz7FqFsC";
  const premiumMemeUrl = "https://onlyfans.wtf/marcus.team.official";

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 9) {
      setShowMemeDialog(true);
      setClickCount(0);
    }
  };

  return (
    <>
    <header className="absolute top-0 left-0 right-0 z-20">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
            <div onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer">
                <MarcusLogo />
                <h1 className="text-xl font-bold text-white font-vfont">MARCUS</h1>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                <Link href={supportServerUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                Support
                </Link>
                 <Link href="/features" className="transition-colors hover:text-white">
                    Fonctionnalités
                </Link>
                <Link href="/premium" className="transition-colors hover:text-white">
                Premium
                </Link>
            </div>
            <div className="flex items-center gap-2">
                <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                        Ajouter le Bot
                    </Button>
                </a>
            </div>
        </div>
    </header>

    <AlertDialog open={showMemeDialog} onOpenChange={setShowMemeDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <Sparkles className="text-yellow-400"/>
                    Accès Exclusif Débloqué !
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Votre persévérance a payé ! Vous avez trouvé un accès secret à notre contenu premium le plus exclusif. Ne le partagez avec personne...
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                 <Button variant="outline" onClick={() => setShowMemeDialog(false)}>
                    Retour à la raison
                </Button>
                <a href={premiumMemeUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMemeDialog(false)}>
                     <Button className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                        Voir le contenu secret
                    </Button>
                </a>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
