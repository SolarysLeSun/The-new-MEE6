

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircleQuestion, Trash2, PlusCircle, Gamepad2, BrainCircuit, AlertTriangle, Image, FileLock, Bot, UserCog, Send, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { KnowledgeBaseItem, ConversationalAgentConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useServerInfo } from '@/hooks/use-server-info';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { Badge } from '@/components/ui/badge';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

function AgentPersonalityGenerator({ config, onUpdate }: { config: ConversationalAgentConfig, onUpdate: (newConfig: ConversationalAgentConfig) => void }) {
    const { toast } = useToast();
    const [name, setName] = useState(config.agent_name || '');
    const [instructions, setInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/personas/generate-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, instructions }),
            });
            if (!response.ok) throw new Error('Generation failed');
            const { personaPrompt } = await response.json();
            
            const nameMatch = personaPrompt.match(/Nom\s*:\s*([^\n]+)/i);
            const newName = nameMatch ? nameMatch[1].trim() : name;
            
            onUpdate({ ...config, persona_prompt: personaPrompt, agent_name: newName });
            toast({ title: "Identité Générée !", description: `Une nouvelle personnalité a été créée pour ${newName}.` });
        } catch (error) {
            toast({ title: "Erreur de Génération", description: "Impossible de générer une nouvelle identité.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="p-4 border rounded-lg bg-background/50">
                <h4 className="font-semibold mb-2">Histoire Actuelle de "{config.agent_name}"</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{config.persona_prompt || "Aucune histoire n'a encore été générée."}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Générateur de Personnalité</CardTitle>
                    <CardDescription>Créez l'identité et l'histoire de votre agent IA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nom initial (optionnel)</Label>
                        <Input placeholder="Un nom pour commencer..." value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tags de personnalité / Instructions de base</Label>
                        <Input placeholder="Ex: geek, sarcastique, fan de science-fiction" value={instructions} onChange={e => setInstructions(e.target.value)} />
                    </div>
                    <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw className="mr-2"/>}
                        {config.persona_prompt ? 'Régénérer l identité' : 'Générer une identité'}
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}

function AgentPageContent({ isPremium, serverId }: { isPremium: boolean, serverId: string }) {
    const { toast } = useToast();
    const [config, setConfig] = useState<ConversationalAgentConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/conversational-agent`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch initial data');
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0)); // Text channels only
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration de l'agent.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: ConversationalAgentConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/conversational-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof ConversationalAgentConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handleDataSharingChange = (key: keyof ConversationalAgentConfig['data_sharing'], value: boolean) => {
        if (!config) return;
        const newDataSharing = { ...config.data_sharing, [key]: value };
        handleValueChange('data_sharing', newDataSharing);
    }
    
    const handleAgentActionsChange = (key: keyof ConversationalAgentConfig['agent_actions'], value: boolean) => {
        if (!config) return;
        const newAgentActions = { ...config.agent_actions, [key]: value };
        handleValueChange('agent_actions', newAgentActions);
    }
    
    const handleKnowledgeBaseChange = (index: number, field: 'question' | 'answer', value: string) => {
        if (!config) return;
        const newKnowledgeBase = [...config.knowledge_base];
        newKnowledgeBase[index] = { ...newKnowledgeBase[index], [field]: value };
        handleValueChange('knowledge_base', newKnowledgeBase);
    };

    const addKnowledgeBaseItem = () => {
        if (!config) return;
        const newItem: KnowledgeBaseItem = { id: uuidv4(), question: '', answer: '' };
        handleValueChange('knowledge_base', [...config.knowledge_base, newItem]);
    };

    const removeKnowledgeBaseItem = (id: string) => {
        if (!config) return;
        handleValueChange('knowledge_base', config.knowledge_base.filter(item => item.id !== id));
    };


    if (loading || !config) {
        return <PageSkeleton />;
    }

    const channelOptions = [
        { value: 'none', label: 'Aucun (répond aux mentions seulement)' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];


    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper className="space-y-8">
                 <GlobalAiStatusAlert />
                {/* Section Activation */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Activation de l'Agent</CardTitle>
                            <Switch id="enable-agent" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                        </div>
                        <CardDescription>
                            Activez l'agent pour qu'il réponde lorsqu'on le mentionne ou dans son salon dédié.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="dedicated-channel">Salon de conversation dédié</Label>
                             <p className="text-sm text-muted-foreground/80">
                                Dans ce salon, chaque message sera traité par l'IA (les mentions ne sont pas nécessaires).
                            </p>
                             <Combobox
                                options={channelOptions}
                                value={config.dedicated_channel_id || 'none'}
                                onChange={(value) => handleValueChange('dedicated_channel_id', value === 'none' ? null : value)}
                                placeholder="Sélectionner un salon"
                                searchPlaceholder="Rechercher un salon..."
                                emptyPlaceholder="Aucun salon trouvé."
                                className="w-full md:w-[280px]"
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Section Mode Humain */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Mode Humain</CardTitle>
                            <Switch id="enable-human-mode" checked={config.human_mode_enabled ?? false} onCheckedChange={(val) => handleValueChange('human_mode_enabled', val)} />
                        </div>
                        <CardDescription>
                            Transforme l'agent en une IA persistante avec sa propre personnalité, mémoire et relations.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Section Personnalité */}
                {config.human_mode_enabled ? (
                    <AgentPersonalityGenerator config={config} onUpdate={saveConfig} />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Personnalité de l'Agent</CardTitle>
                            <CardDescription>
                                Définissez qui est votre agent IA.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="agent-name">Nom de l'agent</Label>
                                <Input id="agent-name" placeholder="Ex: GLaDOS, Assistant de Support" defaultValue={config.agent_name} onBlur={(e) => handleValueChange('agent_name', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agent-role">Rôle / Mission</Label>
                                <p className="text-sm text-muted-foreground/80">Décrit sa fonction principale. Ex: "Un expert en jardinage".</p>
                                <Textarea id="agent-role" placeholder="Laissez vide pour un assistant généraliste." defaultValue={config.agent_role} onBlur={(e) => handleValueChange('agent_role', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agent-personality">Personnalité et Ton</Label>
                                <p className="text-sm text-muted-foreground/80">Donne un caractère à votre IA. Ex: "Sarcastique et plein d'humour noir".</p>
                                <Textarea id="agent-personality" placeholder="Laissez vide pour une personnalité neutre et serviable." defaultValue={config.agent_personality} onBlur={(e) => handleValueChange('agent_personality', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                )}


                 {/* Section Prompt Personnalisé */}
                <Card>
                    <CardHeader>
                        <CardTitle>Instructions Comportementales</CardTitle>
                        <CardDescription>
                           Définissez ici des règles de comportement que l'agent doit toujours suivre.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="Exemple : Ne jamais mentionner la politique. Toujours répondre en moins de 3 phrases. Ne pas utiliser d'emojis." 
                            rows={4}
                            defaultValue={config.custom_prompt}
                            onBlur={(e) => handleValueChange('custom_prompt', e.target.value)}
                        />
                    </CardContent>
                </Card>
                
                 {/* Section Base de connaissances */}
                <Card>
                    <CardHeader>
                        <CardTitle>Base de connaissances</CardTitle>
                        <CardDescription>
                            {config.human_mode_enabled 
                                ? "En Mode Humain, la mémoire de l'IA est gérée automatiquement. Vous pourrez bientôt visualiser et éditer ses souvenirs ici." 
                                : "Fournissez à l'IA des informations spécifiques sur votre serveur pour qu'elle puisse répondre aux questions des utilisateurs."
                            }
                        </CardDescription>
                    </CardHeader>
                    {config.human_mode_enabled ? (
                         <CardContent>
                            <Alert variant="default" className="border-blue-500/30">
                                <BrainCircuit className="h-4 w-4" />
                                <AlertTitle>Mode Mémoire Automatique</AlertTitle>
                                <AlertDescription>
                                    La gestion manuelle est désactivée. L'IA apprend et se souvient des conversations pour construire sa propre base de connaissances.
                                </AlertDescription>
                            </Alert>
                         </CardContent>
                    ) : (
                        <CardContent className="space-y-4">
                            {(config.knowledge_base || []).map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-lg bg-card-foreground/5 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-semibold">Fait / Question {index + 1}</Label>
                                        <Button variant="ghost" size="icon" onClick={() => removeKnowledgeBaseItem(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                    </div>
                                    <Input 
                                        placeholder="Sujet ou question clé (ex: 'règles du serveur', 'comment rejoindre l'équipe')" 
                                        defaultValue={item.question}
                                        onBlur={(e) => handleKnowledgeBaseChange(index, 'question', e.target.value)}
                                    />
                                    <Textarea 
                                        placeholder="Informations et réponse que l'agent doit fournir sur ce sujet." 
                                        defaultValue={item.answer}
                                        onBlur={(e) => handleKnowledgeBaseChange(index, 'answer', e.target.value)}
                                    />
                                </div>
                            ))}
                             <Button variant="outline" className="w-full" onClick={addKnowledgeBaseItem}>
                                <PlusCircle className="mr-2" />
                                Ajouter un élément de connaissance
                            </Button>
                        </CardContent>
                    )}
                </Card>


                {/* Section Partage de Données */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileLock /> Partage de Données Utilisateur</CardTitle>
                        <CardDescription>
                           Autorisez l'agent à accéder à certaines données des utilisateurs pour des réponses plus contextuelles et personnalisées.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="share-sanctions" className="font-semibold">Partager l'historique des sanctions</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Permet à l'IA d'adapter son ton en fonction du comportement passé de l'utilisateur.
                                </p>
                            </div>
                            <Switch id="share-sanctions" checked={config.data_sharing?.share_sanction_history ?? false} onCheckedChange={(val) => handleDataSharingChange('share_sanction_history', val)} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="share-roles" className="font-semibold">Partager les rôles</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Permet à l'IA de connaître le statut d'un membre (ex: Modérateur, VIP).
                                </p>
                            </div>
                            <Switch id="share-roles" checked={config.data_sharing?.share_roles ?? false} onCheckedChange={(val) => handleDataSharingChange('share_roles', val)} />
                        </div>
                        <Separator />
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="share-level" className="font-semibold">Partager le niveau et l'XP</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Permet à l'IA de commenter la progression de l'utilisateur.
                                </p>
                            </div>
                            <Switch id="share-level" checked={config.data_sharing?.share_level ?? false} onCheckedChange={(val) => handleDataSharingChange('share_level', val)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Section Modules Comportementaux */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BrainCircuit /> Modules Comportementaux</CardTitle>
                        <CardDescription>
                           Rendez votre agent plus proactif et intelligent.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-imagination" className="font-bold">Autoriser l'imagination</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Permet à l'agent d'inventer des réponses et de les ajouter à ses connaissances si une information est manquante.
                                </p>
                            </div>
                            <Switch id="enable-imagination" checked={config.allow_imagination ?? false} onCheckedChange={(val) => handleValueChange('allow_imagination', val)} />
                        </div>
                        <Separator />
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-image-generation" className="font-bold flex items-center gap-2"><Image/>Autoriser la génération d'images</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Permet à l'agent de décider de générer une image pour accompagner sa réponse.
                                </p>
                            </div>
                            <Switch id="enable-image-generation" checked={config.allow_image_generation ?? false} onCheckedChange={(val) => handleValueChange('allow_image_generation', val)} />
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="enable-freewheeling" className="font-bold text-destructive">Mode Roue Libre</Label>
                                    <p className="text-sm text-muted-foreground/80">
                                        Désactive les filtres de sécurité pour les insultes et le contenu NSFW.
                                    </p>
                                </div>
                                <Switch id="enable-freewheeling" checked={config.allow_freewheeling ?? false} onCheckedChange={(val) => handleValueChange('allow_freewheeling', val)} />
                            </div>
                             {config.allow_freewheeling && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Mode sans filtre activé</AlertTitle>
                                    <AlertDescription>
                                        En activant cette option, l'agent peut générer du contenu inapproprié. Utilisez avec une extrême prudence.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
                 {/* Section Actions de l'agent */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot />Actions de l'Agent</CardTitle>
                        <CardDescription>
                           Permettez à l'IA d'effectuer des actions sur le serveur en votre nom.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="can_give_xp" className="font-semibold flex items-center gap-2"><Gamepad2/>Donner de l'XP</Label>
                            <Switch id="can_give_xp" checked={config.agent_actions?.can_give_xp ?? false} onCheckedChange={(val) => handleAgentActionsChange('can_give_xp', val)} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                           <Label htmlFor="can_apply_sanctions" className="font-semibold flex items-center gap-2"><AlertTriangle/>Appliquer des sanctions</Label>
                           <Switch id="can_apply_sanctions" checked={config.agent_actions?.can_apply_sanctions ?? false} onCheckedChange={(val) => handleAgentActionsChange('can_apply_sanctions', val)} />
                        </div>
                    </CardContent>
                </Card>
            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    );
}

export default function ConversationalAgentPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { serverInfo, loading } = useServerInfo();

  return (
    <div className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Agent Conversationnel IA
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez un agent IA entièrement personnalisé qui répond lorsqu'on le mentionne ou dans un salon dédié.
        </p>
      </div>
      
      <Separator />

      {loading ? (
        <PageSkeleton />
      ) : (
        <AgentPageContent isPremium={serverInfo?.isPremium || false} serverId={serverId} />
      )}
    </div>
  );
}

if (typeof window !== 'undefined' && !(window as any).uuidv4) {
    (window as any).uuidv4 = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
