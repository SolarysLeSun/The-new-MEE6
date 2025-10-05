

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  ShieldCheck,
  Hammer,
  Bot,
  Mic,
  FileClock,
  Sparkles,
  Languages,
  Lock,
  Camera,
  ScanSearch,
  Fingerprint,
  Ticket,
  Calendar,
  ToyBrick,
  GraduationCap,
  Wrench,
  MessageSquare,
  Voicemail,
  Palette,
  DatabaseBackup,
  MessageCircleQuestion,
  Lightbulb,
  Users,
  UserSquare,
  BadgePlus,
  ShieldAlert,
  TestTubeDiagonal,
  X,
  UserPlus,
  Megaphone,
  Info,
  FileText,
  Code,
  Dice5,
  Shield,
  Star,
  Award,
  Plus,
  Gamepad,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from './ui/badge';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { useServerInfo } from '@/hooks/use-server-info';
import GradientText from './ui/gradient-text';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ServerSidebar } from './server-sidebar';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

export const navCategories = [
    {
        name: 'Général',
        items: [
            { href: 'commandes-generales', label: 'Commandes Générales', icon: Wrench, keywords: ['invite', 'ping', 'traduire', 'say', 'level', 'topxp'] },
            { href: 'identite', label: 'Identité du Bot', icon: UserSquare, keywords: ['surnom', 'nom', 'avatar', 'profil'] },
            { href: 'annonces', label: 'Annonces', icon: Megaphone, keywords: ['announce', 'publication', 'message global'] },
            { href: 'assistant-communautaire', label: 'Assistant Communautaire', icon: MessageSquare, isPremium: true, keywords: ['faq', 'questions', 'réponses', 'aide', 'ia'] },
            { href: 'suggestions', label: 'Suggestions', icon: Lightbulb, keywords: ['idée', 'boîte à idées', 'suggérer'] },
            { href: 'traduction-automatique', label: 'Traduction Auto', icon: Languages, keywords: ['translate', 'langue', 'international'] },
            { href: 'niveaux', label: 'Niveaux & XP', icon: Award, keywords: ['level', 'xp', 'expérience', 'classement', 'topxp', 'rewards', 'récompenses'] },
        ]
    },
    {
        name: 'Modération',
        items: [
            { href: 'moderation', label: 'Bans & Kicks', icon: Hammer, keywords: ['ban', 'kick', 'unban', 'mute', 'warn', 'sanction', 'expulser', 'bannir'] },
            { href: 'auto-moderation', label: 'Auto-Modération', icon: Bot, keywords: ['filtre', 'mots-clés', 'automod', 'censure'] },
            { href: 'lock', label: 'Lock/Unlock', icon: Lock, keywords: ['verrouiller', 'déverrouiller', 'salon'] },
            { href: 'logs', label: 'Logs', icon: FileClock, keywords: ['journal', 'événements', 'audit'] },
        ]
    },
    {
        name: 'Administration',
        items: [
            { href: 'administration', label: 'Outils Admin', icon: Shield, keywords: ['purge', 'ghostping', 'clone', 'maintenance'] }
        ]
    },
    {
        name: 'Sécurité',
        items: [
            { href: 'anti-bot', label: 'Anti-Bot', icon: ShieldCheck, keywords: ['protection', 'sécurité', 'robot'] },
            { href: 'anti-raid', label: 'Anti-Raid', icon: ShieldAlert, keywords: ['protection', 'arrivée massive', 'sécurité'] },
            { href: 'scanner-liens-ia', label: 'Scanner de Liens IA', icon: ScanSearch, isPremium: true, keywords: ['sécurité', 'url', 'phishing', 'scam', 'ia'] },
            { href: 'filtre-image-ia', label: 'Filtre d\'Image IA', icon: Camera, isPremium: true, keywords: ['sécurité', 'nsfw', 'ia', 'image'] },
            { href: 'captcha', label: 'Captcha', icon: Fingerprint, isPremium: true, keywords: ['vérification', 'sécurité', 'nouveau membre'] },
            { href: 'backup', label: 'Backup', icon: DatabaseBackup, keywords: ['sauvegarde', 'restauration', 'export', 'import'] },
            { href: 'securite-avancee', label: 'Sécurité Avancée', icon: ShieldAlert, keywords: ['alerte', 'compte suspect', 'nom similaire'] },
        ]
    },
    {
        name: 'Automatisation',
        items: [
            { href: 'commandes-personnalisees', label: 'Commandes Personnalisées', icon: Code, isPremium: true, isDisabled: true, keywords: ['custom command', 'créer commande'] },
            { href: 'salons-prives', label: 'Salons Privés', icon: Ticket, keywords: ['ticket', 'support', 'salon privé'] },
            { href: 'evenements', label: 'Événements & Calendrier', icon: Calendar, keywords: ['event', 'planning', 'organisation', 'tournoi', 'concours'] },
            { href: 'accueil-integration', label: 'Accueil & Intégration', icon: UserPlus, keywords: ['welcome', 'bienvenue', 'autorole', 'questionnaire'] },
        ]
    },
     {
        name: 'Divertissement',
        items: [
            { href: 'commandes-fun', label: 'Commandes Fun', icon: Dice5, keywords: ['renameall', 'mutemass', 'reactbomb', 'randomnickname', 'fun'] },
            { href: 'casino', label: 'Casino', icon: Gamepad, keywords: ['pileouface', 'slots', 'jeu', 'xp'] },
            { href: 'roue-de-la-fortune', label: 'Roue de la Fortune', icon: History, keywords: ['roue', 'fortune', 'tirage', 'hasard'] },
        ]
    },
    {
        name: 'Vocaux',
        items: [
             { href: 'controle-manuel', label: 'Contrôle manuel', icon: Voicemail, keywords: ['join', 'leave', 'parle', 'vocal', 'tts'] },
             { href: 'vocaux-ia', label: 'IA Vocaux', icon: Mic, isPremium: true, keywords: ['smart voice', 'nom dynamique', 'vocal ia'] },
             { href: 'webcam-control', label: 'Contrôle Vidéo', icon: Camera, keywords: ['webcam', 'stream', 'partage écran'] },
        ]
    },
     {
        name: 'Outils IA',
        items: [
            { href: 'constructeur-serveur-ia', label: 'Server Builder IA', icon: ToyBrick, isPremium: true, keywords: ['iacreateserv', 'créer serveur', 'template', 'modèle'] },
            { href: 'assistant-moderation-ia', label: 'Assistant Modération IA', icon: Sparkles, isPremium: true, keywords: ['ia', 'toxicité', 'modération auto'] },
            { href: 'createur-contenu-ia', label: 'Créateur de Contenu IA', icon: Palette, isPremium: true, keywords: ['iacontent', 'générer image', 'générer annonce', 'ia'] },
            { href: 'agent-conversationnel', label: 'Agent Conversationnel', icon: MessageCircleQuestion, isPremium: true, keywords: ['ia', 'chatbot', 'personnalité', 'conversation'] },
            { href: 'personnages-ia', label: 'Personnages IA', icon: Users, isPremium: true, isDisabled: true, keywords: ['ia', 'roleplay', 'personna'] },
            { href: 'commandes-testeurs', label: 'Commandes Spéciales', icon: TestTubeDiagonal, isPremium: true, keywords: ['mp', 'webhook', 'tester', 'givepremium', 'genpremium', 'owner'] },
        ]
    },
    {
        name: 'Outils',
        items: [
            { href: 'transcript-viewer', label: 'Lecteur de Transcriptions', icon: FileText, keywords: ['save', 'log', 'historique', 'html'] },
        ]
    }
];

function SidebarHeaderSkeleton() {
    return (
        <div className="mb-6 flex items-center gap-3 px-2">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20" />
            </div>
        </div>
    );
}


export function ModuleSidebar({ serverId: serverIdProp, isOpen, setOpen }: { serverId: string, isOpen: boolean, setOpen: (isOpen: boolean) => void }) {
  const pathname = usePathname();
  const params = useParams();
  const serverId = (params.serverId || serverIdProp) as string;

  const { serverInfo, loading } = useServerInfo();
  
  useEffect(() => {
    // Close sidebar on route change on mobile
    if (isOpen) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  return (
    <>
    {/* Overlay for mobile */}
    {isOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setOpen(false)} />}

    <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-30 flex h-full w-full md:w-80 flex-col bg-card/80 backdrop-blur-xl p-4 border-r border-border/10 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 px-2">
            {loading ? (
            <SidebarHeaderSkeleton />
            ) : serverInfo ? (
            <>
                <Avatar className="h-12 w-12 rounded-lg">
                {serverInfo.icon ? (
                    <AvatarImage src={serverInfo.icon} />
                ) : (
                    <AvatarFallback>{serverInfo.name.charAt(0)}</AvatarFallback>
                )}
                </Avatar>
                <div>
                <GradientText className="text-lg font-semibold">{serverInfo.name}</GradientText>
                {serverInfo.isPremium && <Badge className="mt-1 border-0 bg-yellow-500 text-black">Premium</Badge>}
                </div>
            </>
            ) : (
            <SidebarHeaderSkeleton /> // Show skeleton on error or if no details
            )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Server list for mobile */}
      <div className="md:hidden mb-4">
        <h3 className="px-3 py-2 text-xs font-bold uppercase text-muted-foreground">Changer de Serveur</h3>
        <div className="flex flex-wrap gap-2 p-2 justify-center">
          <ServerSidebar serverId={serverId} />
        </div>
      </div>


      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
      <TooltipProvider>
        {navCategories.map((category) => (
            <div key={category.name}>
                <h3 className="px-3 py-2 text-xs font-bold uppercase text-muted-foreground">{category.name}</h3>
                <div className="flex flex-col gap-1">
                    {category.items.map((item) => {
                      const fullPath = serverId ? `/dashboard/${serverId}/${item.href}` : '#';
                      const isActive = pathname === fullPath;
                      return (
                        <Link key={item.label} href={fullPath} className={!serverId ? 'pointer-events-none' : ''}>
                           <Button
                             variant={isActive ? 'secondary' : 'ghost'}
                             className={cn('w-full justify-start gap-3', { 'bg-secondary text-white': isActive, 'text-muted-foreground hover:text-white': !isActive})}
                             disabled={!serverId || item.isDisabled}
                           >
                               <item.icon className={cn('h-5 w-5', { 'text-primary': isActive })} />
                               <span className="flex-grow text-left">{item.label}</span>
                               {item.isPremium && <Sparkles className="h-4 w-4 text-yellow-400" />}
                               {item.isDisabled && (
                                   <Tooltip>
                                       <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-orange-400"/>
                                       </TooltipTrigger>
                                       <TooltipContent>
                                           <p>Ce module est en cours de développement.</p>
                                       </TooltipContent>
                                   </Tooltip>
                               )}
                           </Button>
                        </Link>
                      );
                    })}
                </div>
            </div>
        ))}
        </TooltipProvider>
      </nav>
      <div className="mt-auto pt-4 text-center">
          <a href="https://forgenet.fr" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-white transition-colors">
              Développé par NightForge
          </a>
      </div>
    </aside>
    </>
  );
}
