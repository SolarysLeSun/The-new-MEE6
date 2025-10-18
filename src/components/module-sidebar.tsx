

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
  Wrench,
  MessageSquare,
  Voicemail,
  Palette,
  DatabaseBackup,
  MessageCircleQuestion,
  Lightbulb,
  Users,
  UserSquare,
  ShieldAlert,
  TestTubeDiagonal,
  X,
  UserPlus,
  Megaphone,
  Info,
  FileText,
  Code,
  Dice5,
  Award,
  BrainCircuit,
  Gift,
  Dices,
  Save,
  PencilRuler,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useServerInfo } from '@/hooks/use-server-info';
import GradientText from './ui/gradient-text';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

export const navCategories = [
    {
        name: 'Général',
        items: [
            { href: 'commandes-generales', label: 'Commandes Générales', icon: Wrench, keywords: ['ping', 'invite', 'say', 'traduire', 'help', 'marcus', 'login', 'marcusfaq'] },
            { href: 'identite', label: 'Identité du Bot', icon: UserSquare, keywords: ['nom', 'surnom', 'avatar', 'profil'] },
            { href: 'annonces', label: 'Annonces', icon: Megaphone, keywords: ['announce', 'publication', 'message global'] },
            { href: 'assistant-communautaire', label: 'Assistant Communautaire', icon: MessageSquare, isPremium: true, keywords: ['faq', 'questions', 'réponses', 'aide', 'suggestion programmée'] },
            { href: 'suggestions', label: 'Suggestions', icon: Lightbulb, keywords: ['idées', 'boîte à idées', 'feedback', 'setsuggest'] },
            { href: 'traduction-automatique', label: 'Traduction Auto', icon: Languages, isPremium: true, keywords: ['translate', 'multilingue', 'langue'] },
            { href: 'niveaux', label: 'Niveaux & XP', icon: Award, keywords: ['levels', 'rank', 'classement', 'exp', 'expérience', 'récompenses', 'topxp', 'podium'] },
            { href: 'parrainage', label: 'Parrainage', icon: Gift, keywords: ['récompense', 'premium', 'inviter', 'code'] },
        ]
    },
    {
        name: 'Modération',
        items: [
            { href: 'moderation', label: 'Bans & Kicks', icon: Hammer, keywords: ['sanctions', 'avertir', 'warn', 'mute', 'timeout', 'unban', 'kickvoc', 'listwarns'] },
            { href: 'auto-moderation', label: 'Auto-Modération', icon: Bot, keywords: ['filtres', 'mots-clés', 'automod', 'gif'] },
            { href: 'anti-afk', label: 'Anti-AFK', icon: UserX, keywords: ['inactif', 'vocal', 'déconnecter'] },
            { href: 'lock', label: 'Lock/Unlock', icon: Lock, keywords: ['verrouiller', 'déverrouiller', 'salon', 'unlock'] },
            { href: 'logs', label: 'Logs', icon: FileClock, keywords: ['journaux', 'événements', 'audit'] },
        ]
    },
    {
        name: 'Sécurité',
        items: [
            { href: 'anti-bot', label: 'Anti-Bot', icon: ShieldCheck, keywords: ['sécurité', 'protection', 'robots'] },
            { href: 'anti-raid', label: 'Anti-Raid', icon: ShieldAlert, keywords: ['sécurité', 'protection', 'attaques'] },
            { href: 'scanner-liens-ia', label: 'Scanner de Liens IA', icon: ScanSearch, isPremium: true, keywords: ['sécurité', 'anti-scam', 'phishing'] },
            { href: 'filtre-image-ia', label: 'Filtre d\'Image IA', icon: Camera, isPremium: true, keywords: ['sécurité', 'nsfw', 'modération image'] },
            { href: 'captcha', label: 'Captcha', icon: Fingerprint, isPremium: true, keywords: ['sécurité', 'vérification', 'humain'] },
            { href: 'backup', label: 'Backup', icon: DatabaseBackup, keywords: ['sauvegarde', 'restauration', 'export'] },
            { href: 'securite-avancee', label: 'Sécurité Avancée', icon: ShieldAlert, keywords: ['faux comptes', 'nom similaire', 'âge compte'] },
            { href: 'role-memory', label: 'Persistance des Rôles', icon: Save, isPremium: true, keywords: ['sauvegarder', 'mémoire', 'quitter', 'rejoindre'] },
        ]
    },
    {
        name: 'Automatisation',
        items: [
            { href: 'commandes-personnalisees', label: 'Commandes Personnalisées', icon: Code, isPremium: true, isDisabled: true, keywords: ['custom commands', 'créer commande'] },
            { href: 'salons-prives', label: 'Salons Privés', icon: Ticket, keywords: ['tickets', 'support', 'groupes', 'addprivate', 'privateresum'] },
            { href: 'evenements', label: 'Événements & Calendrier', icon: Calendar, keywords: ['events', 'planning', 'organisation', 'event-create', 'event-list'] },
            { href: 'accueil-integration', label: 'Accueil & Intégration', icon: UserPlus, keywords: ['bienvenue', 'welcome', 'autorole', 'questionnaire'] },
        ]
    },
     {
        name: 'Divertissement',
        items: [
            { href: 'commandes-fun', label: 'Commandes Fun', icon: Dice5, keywords: ['renameall', 'mutemass', 'reactbomb', 'react', 'randomnickname'] },
            { href: 'roue-de-la-fortune', label: 'Roue de la Fortune', icon: Dices, keywords: ['tirage', 'giveaway', 'roue', 'fortune', 'aléatoire'] },
            { href: 'creation-amitie', label: "Création d'Amitié", icon: Users, isPremium: true, isDisabled: true, keywords: ['amitié', 'relation', 'affinité', 'lien'] },
        ]
    },
    {
        name: 'Vocaux',
        items: [
             { href: 'controle-manuel', label: 'Contrôle manuel', icon: Voicemail, keywords: ['join', 'leave', 'parle', 'vocal'] },
             { href: 'vocaux-ia', label: 'IA Vocaux', icon: Mic, isPremium: true, keywords: ['smart voice', 'nom dynamique', 'vocal intelligent'] },
             { href: 'webcam-control', label: 'Contrôle Vidéo', icon: Camera, keywords: ['caméra', 'stream', 'partage écran'] },
        ]
    },
     {
        name: 'Outils IA',
        items: [
            { href: 'assistant-ia', label: 'Assistant Personnel IA', icon: BrainCircuit, keywords: ['ia', 'copilot', 'aide', 'correction', 'calcul'] },
            { href: 'constructeur-serveur-ia', label: 'Server Builder IA', icon: ToyBrick, isPremium: true, keywords: ['créer serveur', 'template', 'modèle'] },
            { href: 'assistant-moderation-ia', label: 'Assistant Modération IA', icon: Sparkles, isPremium: true, keywords: ['modération ia', 'anti-toxicité'] },
            { href: 'createur-contenu-ia', label: 'Créateur de Contenu IA', icon: Palette, isPremium: true, keywords: ['générer annonce', 'générer règle', 'générer image', 'iacontent'] },
            { href: 'agent-conversationnel', label: 'Agent Conversationnel', icon: MessageCircleQuestion, isPremium: true, keywords: ['chatbot', 'personnalité', 'base de connaissances'] },
            { href: 'commandes-testeurs', label: 'Commandes Spéciales', icon: TestTubeDiagonal, isPremium: true, keywords: ['mp', 'webhook', 'givepremium', 'genpremium', 'tester', 'owner'] },
        ]
    },
    {
        name: 'Outils',
        items: [
            { href: 'transcript-viewer', label: 'Lecteur de Transcriptions', icon: FileText, keywords: ['html', 'log', 'conversation', 'sauvegarde', 'save'] },
            { href: 'embed-builder', label: "Constructeur d'Embeds", icon: PencilRuler, keywords: ['embed', 'message personnalisé', 'créer embed'] },
            { href: 'utils', label: 'Commandes Utilitaires', icon: Wrench, keywords: ['save', 'patchnote', 'rappel'] },
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


export function ModuleSidebar({ 
    serverId: serverIdProp, 
    isMobileView = false,
    onLinkClick
}: { 
    serverId: string, 
    isMobileView?: boolean,
    onLinkClick?: () => void
}) {
  const pathname = usePathname();
  const params = useParams();
  const serverId = (params.serverId || serverIdProp) as string;

  const { serverInfo, loading } = useServerInfo();

  return (
    <aside className={cn(
        "flex h-full w-72 flex-col bg-card/80 backdrop-blur-xl p-4 border-r border-border/10",
        isMobileView && "w-full" // Take full width in mobile sheet
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
        {isMobileView && onLinkClick && (
            <Button variant="ghost" size="icon" onClick={onLinkClick}>
                <X className="h-6 w-6" />
            </Button>
        )}
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
                        <Link key={item.label} href={fullPath} className={!serverId ? 'pointer-events-none' : ''} onClick={onLinkClick}>
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
  );
}
