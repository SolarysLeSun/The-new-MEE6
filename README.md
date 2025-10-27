
# Marcus - Bot Discord & Panel de Gestion Web

Marcus est une solution complète pour la gestion de serveurs Discord, combinant un bot puissant écrit en **Discord.js** avec un panel de configuration web moderne et réactif construit avec **Next.js**. Il intègre l'IA générative via **Genkit de Google** pour des fonctionnalités avancées.

## Fonctionnalités Principales

- **Panel de Gestion Web** : Interface web intuitive pour configurer tous les aspects du bot en temps réel.
- **Modération Complète** : Commandes de modération traditionnelles (`/ban`, `/kick`, `/mute`) avec logs et notifications.
- **Auto-Modération** : Règles personnalisables pour filtrer le spam, les liens, les majuscules excessives, etc.
- **Sécurité Avancée** :
    - **Anti-Bot** : Protège contre l'ajout de bots non autorisés avec un système de liste blanche et d'approbation.
    - **Anti-Raid** : Détecte et réagit aux arrivées massives de nouveaux membres.
    - **Captcha** : Système de vérification pour les nouveaux membres.
    - **Backup** : Exportez et importez la structure de votre serveur (salons, rôles) en JSON.
- **Modules IA (Premium)** :
    - **Filtre d'Image IA** : Analyse les images pour détecter le contenu inapproprié.
    - **Assistant Modération IA** : Détecte la toxicité dans les messages en temps réel.
    - **IA Vocaux** : Renomme dynamiquement les salons vocaux en fonction de l'activité des membres.
    - **Créateur de Contenu IA** : Génère des annonces, des règles et des images via des commandes simples.
    - Et bien plus encore...
- **Système de Logs** : Journal d'événements complet pour suivre tout ce qui se passe sur votre serveur.
- **Salons Privés** : Système de tickets simple pour les utilisateurs.
- **Gestion des Permissions** : Contrôle fin sur qui peut utiliser quelle commande.

---

## Commandes pour le Propriétaire

Le propriétaire du bot a accès à des commandes globales spéciales pour la gestion du bot lui-même :

- `/adminannounce` : Envoie une annonce à **tous les serveurs** où le bot est présent.
- `/devadminannounce` : Envoie une annonce uniquement aux serveurs marqués comme "développement".
- `/devserver` : Gère la liste des serveurs de développement.
- `/delegate` : Délègue des permissions restreintes (comme `/genpremium`) à d'autres utilisateurs de confiance.
- `/genpremium` : Génère des clés d'activation pour le mode Premium.
- `/givepremium` : Active ou désactive manuellement le statut Premium pour un serveur.
- `/panelmessage` : Affiche un message d'alerte global sur le panel web.
- `/restart` : Redémarre le processus du bot.
- `/system` : Affiche le statut des processus du bot (cluster PM2).
- `/status` : Change le statut personnalisé du bot ("Joue à...").
- `/disableia` & `/enableia` : Active ou désactive globalement toutes les fonctionnalités d'IA en cas de problème.

---

## Charte Graphique (Emojis Personnalisés)

Le bot utilise des emojis personnalisés pour une meilleure expérience visuelle, notamment dans les annonces et les messages formatés. Voici les emojis utilisés et leur identifiant :

- `<:fleche:1421563500190371932>` - Préfixe de titre
- `<:point_h:1421563605630845009>` - Puce de liste
- `<:warn:1421563647909560462>` - Avertissement important
- `<:Oui:1421563353888723084>` - Confirmation / Oui
- `<:Non:1421563259537850471>` - Annulation / Non
- `<:Option:1421563335094042796>` - Modification / Option

---

## Lancement du Projet

### 1. Prérequis

- **Node.js** : Version 18 ou supérieure.
- **Compte Discord & Application Bot** : Vous devez créer une application sur le [Portail des Développeurs Discord](https://discord.com/developers/applications).
    - Activez les "Privileged Gateway Intents" (`SERVER MEMBERS INTENT`, `MESSAGE CONTENT INTENT`) pour votre bot.
- **API Google AI** : Pour les fonctionnalités IA, vous aurez besoin d'une clé API depuis [Google AI Studio](https://aistudio.google.com/app/apikey).
- **PM2** : Un gestionnaire de processus pour Node.js. Installez-le globalement avec `npm install -g pm2`.

### 2. Installation

Clonez le projet et installez les dépendances :

```bash
git clone <votre-repo>
cd <nom-du-projet>
npm install
```

### 3. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet en vous basant sur cet exemple :

```env
# --- Discord Bot ---
# Le token secret de votre bot
DISCORD_TOKEN="VOTRE_TOKEN_DISCORD"
# L'ID client de votre application Discord
DISCORD_CLIENT_ID="VOTRE_CLIENT_ID"
# Le secret client de votre application Discord
DISCORD_CLIENT_SECRET="VOTRE_CLIENT_SECRET"
# L'ID de votre serveur de support, utilisé pour les récompenses de boost
SUPPORT_SERVER_ID="ID_DE_VOTRE_SERVEUR_SUPPORT"

# --- Google AI (Genkit) ---
# Votre clé API Google AI pour les fonctionnalités IA
GEMINI_API_KEY="VOTRE_CLE_API_GEMINI"

# --- URLs de l'application ---
# L'URL de base de votre panel web. Pour le développement local :
PANEL_BASE_URL="http://localhost:9002"
# L'URL de l'API interne du bot. Pour le développement local :
BOT_API_URL="http://localhost:3001/api"
```

### 4. Lancer l'Application

#### En Mode Développement

Pour le développement, vous pouvez lancer les deux processus séparément.

- **Pour lancer le bot** (gère la logique Discord) :
  ```bash
  npm run bot:dev
  ```
  Le bot se connectera à Discord et son API interne démarrera sur le port 3001.

- **Pour lancer le panel web** (l'interface de configuration) dans un autre terminal :
  ```bash
  npm run dev
  ```
  Le panel sera accessible à l'adresse `http://localhost:9002`.

#### En Mode Production (Recommandé)

Pour la production, utilisez **PM2** pour une meilleure stabilité et performance. PM2 lancera plusieurs instances du bot (une par cœur de CPU) pour garantir qu'il reste en ligne même en cas de crash d'une instance.

1.  **Compilez le bot :**
    ```bash
    npm run bot:build
    ```
    Cette commande compile le code TypeScript du bot en JavaScript dans le dossier `dist`.

2.  **Lancez le bot, le panel et le watchdog avec PM2 :**
    ```bash
    pm2 start ecosystem.config.js
    ```
    Cette commande unique utilise le fichier `ecosystem.config.js` pour lancer et gérer tous les processus nécessaires.

**Commandes PM2 utiles :**
- `pm2 list` : Voir le statut de tous les processus (`bot`, `panel`, `watchdog`).
- `pm2 logs bot` : Afficher les logs du bot en temps réel.
- `pm2 logs panel` : Afficher les logs du panel web.
- `pm2 logs watchdog`: Afficher les logs du service de surveillance.
- `pm2 restart bot` : Redémarrer toutes les instances du bot.
- `pm2 stop all` : Arrêter tous les processus gérés par PM2.
- `pm2 delete all` : Supprimer tous les processus de la liste de PM2.

**Note sur les logs :** Les chemins de logs (`/home/user/.pm2/logs/...`) sont spécifiques à votre environnement serveur. `/mnt/marcus` correspond à la racine de votre projet.

---

## Guide Développeur : Créer un Nouveau Module

Ce guide vous explique comment ajouter une nouvelle fonctionnalité (un "module") au projet. Nous allons prendre l'exemple de la création d'un module simple "Annonce de Bienvenue".

Ce projet utilise TypeScript. Si vous êtes plus familier avec JavaScript, ne vous inquiétez pas ! La syntaxe est très proche. Pensez à TypeScript comme du JavaScript avec des "gardes-fous" qui vous aident à éviter les erreurs courantes.

### Étape 1 : Déclarer votre module dans la Base de Données

Le bot a besoin de savoir que votre module existe pour lui créer une configuration par défaut.

1.  **Ajoutez le nom de votre module au type `Module`** dans `src/types.ts` :

    ```typescript
    // src/types.ts
    export type Module =
        | 'moderation'
        | 'auto-moderation'
        // ... autres modules
        | 'annonce-bienvenue'; // <--- Ajoutez votre module ici
    ```

2.  **Définissez sa configuration par défaut** dans `src/lib/db.ts` :

    ```typescript
    // src/lib/db.ts
    const defaultConfigs: DefaultConfigs = {
        // ... autres configs
        'annonce-bienvenue': {
            enabled: false,
            welcome_channel_id: null,
            welcome_message: "Bienvenue sur le serveur, {user} ! 🎉",
        },
    };
    ```
    - `enabled`: Permet d'activer/désactiver le module depuis le panel.
    - `{user}` est un placeholder que notre bot remplacera par le nom de l'utilisateur.

### Étape 2 : Créer la logique du Bot

C'est ici que vous codez le comportement de votre module. Pour un message de bienvenue, nous avons besoin de réagir à un événement : l'arrivée d'un nouveau membre.

1.  **Créez un nouveau fichier d'événement** : `bot/events/onboarding/welcome.ts`
2.  **Écrivez le code de l'événement**. Ce fichier doit exporter un `name` (le nom de l'événement Discord) et une fonction `execute` (l'action à réaliser).

    ```typescript
    // bot/events/onboarding/welcome.ts
    import { Events, GuildMember, TextChannel } from 'discord.js';
    import { getServerConfig } from '../../../src/lib/db';

    // Le nom de l'événement Discord que nous écoutons
    export const name = Events.GuildMemberAdd;

    // La fonction qui sera exécutée
    export async function execute(member: GuildMember) {
        // Ignore les bots
        if (member.user.bot) return;

        // 1. Récupérer la configuration du module pour ce serveur
        const config = await getServerConfig(member.guild.id, 'annonce-bienvenue');

        // 2. Vérifier si le module est activé et bien configuré
        if (!config?.enabled || !config.welcome_channel_id) {
            return;
        }

        // 3. Récupérer le salon configuré
        const channel = await member.guild.channels.fetch(config.welcome_channel_id) as TextChannel;
        if (!channel) return;

        // 4. Préparer et envoyer le message
        const message = config.welcome_message.replace('{user}', member.toString());
        await channel.send(message);
    }
    ```

Le bot chargera et exécutera automatiquement ce fichier lorsque l'événement `GuildMemberAdd` se produira.

### Étape 3 : Créer l'interface dans le Panel

Maintenant, créons la page qui permettra aux utilisateurs de configurer ce module.

1.  **Ajoutez un lien dans la barre latérale** dans `src/components/module-sidebar.tsx`. Trouvez une catégorie pertinente et ajoutez votre page :

    ```tsx
    // src/components/module-sidebar.tsx
    import { Megaphone } from 'lucide-react'; // Choisissez une icône

    const navCategories = [
        {
            name: 'Général',
            items: [
                // ... autres items
                { href: 'annonces-bienvenue', label: 'Annonces Bienvenue', icon: Megaphone },
            ]
        },
        // ... autres catégories
    ];
    ```

2.  **Créez le fichier de la page** : `src/app/dashboard/[serverId]/annonces-bienvenue/page.tsx`
3.  **Écrivez le code de la page**. Ce fichier utilisera React et des composants pré-faits pour créer l'interface.

    ```tsx
    // src/app/dashboard/[serverId]/annonces-bienvenue/page.tsx
    'use client';

    import { useState, useEffect } from 'react';
    import { useParams } from 'next/navigation';
    import { Card, CardContent, CardHeader } from '@/components/ui/card';
    import { Separator } from '@/components/ui/separator';
    import { Switch } from '@/components/ui/switch';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Textarea } from '@/components/ui/textarea';
    import { useToast } from '@/hooks/use-toast';
    import { Skeleton } from '@/components/ui/skeleton';

    // L'URL de l'API de notre bot
    const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

    // Types pour nos données (bonne pratique)
    interface WelcomeConfig {
        enabled: boolean;
        welcome_channel_id: string | null;
        welcome_message: string;
    }
    interface DiscordChannel { id: string; name: string; type: number; }

    export default function AnnonceBienvenuePage() {
        const params = useParams();
        const serverId = params.serverId as string;
        const { toast } = useToast();

        const [config, setConfig] = useState<WelcomeConfig | null>(null);
        const [channels, setChannels] = useState<DiscordChannel[]>([]);
        const [loading, setLoading] = useState(true);

        // --- Récupération des données ---
        useEffect(() => {
            if (!serverId) return;
            const fetchData = async () => {
                setLoading(true);
                try {
                    // On récupère la config du module ET les détails du serveur (pour avoir la liste des salons)
                    const [configRes, serverDetailsRes] = await Promise.all([
                        fetch(`${API_URL}/get-config/${serverId}/annonce-bienvenue`),
                        fetch(`${API_URL}/get-server-details/${serverId}`)
                    ]);
                    const configData = await configRes.json();
                    const serverDetailsData = await serverDetailsRes.json();
                    
                    setConfig(configData);
                    setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0)); // Garder seulement les salons textuels
                } catch (error) {
                    toast({ title: "Erreur", description: "Impossible de charger la configuration." });
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }, [serverId, toast]);

        // --- Sauvegarde des modifications ---
        const saveConfig = async (newConfig: WelcomeConfig) => {
            setConfig(newConfig); // Met à jour l'interface immédiatement
            try {
                await fetch(`${API_URL}/update-config/${serverId}/annonce-bienvenue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newConfig),
                });
            } catch (error) {
                toast({ title: "Erreur de sauvegarde", variant: "destructive" });
            }
        };

        const handleValueChange = (key: keyof WelcomeConfig, value: any) => {
            if (!config) return;
            saveConfig({ ...config, [key]: value });
        };
        
        // --- Affichage ---
        if (loading || !config) {
            return <Skeleton className="h-64 w-full" />;
        }

        return (
            <div className="space-y-8 max-w-4xl">
                <div>
                    <h1 className="text-3xl font-bold">Annonces de Bienvenue</h1>
                    <p className="text-muted-foreground mt-2">
                    Accueillez chaleureusement vos nouveaux membres avec un message personnalisé.
                    </p>
                </div>
                <Separator />
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">Configuration</h2>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
                            <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                        </div>
                        <Separator />
                        <div>
                            <Label htmlFor="welcome-channel">Salon de bienvenue</Label>
                            <Select value={config.welcome_channel_id || 'none'} onValueChange={(val) => handleValueChange('welcome_channel_id', val === 'none' ? null : val)}>
                                <SelectTrigger id="welcome-channel">
                                    <SelectValue placeholder="Sélectionner un salon" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Désactivé</SelectItem>
                                    {channels.map(channel => (
                                        <SelectItem key={channel.id} value={channel.id}># {channel.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="welcome-message">Message de bienvenue</Label>
                            <p className="text-sm text-muted-foreground">Utilisez {"{user}"} pour mentionner le nouveau membre.</p>
                            <Textarea id="welcome-message" defaultValue={config.welcome_message} onBlur={(e) => handleValueChange('welcome_message', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    ```

Et voilà ! Vous avez ajouté un nouveau module entièrement fonctionnel, configurable depuis le panel et intégré au bot. Vous pouvez suivre ce modèle pour ajouter des commandes, des fonctionnalités IA, ou tout autre événement.
