
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Voicemail, BrainCircuit, Trash2, PlusCircle, UserPlus, Sparkles } from 'lucide-react';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import type { AiRoleMapping } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { Badge } from '@/components/ui/badge';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { Combobox } from '@/components/ui/combobox';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface WelcomeConfig {
    enabled: boolean;
    welcome_channel_id: string | null;
    welcome_message: string;
    use_card: boolean;
    card_background_url: string | null;
    card_text_color: string | null;
    send_in_dm: boolean;
}

interface AutorolesConfig {
    enabled: boolean;
    on_join_roles: string[];
    on_voice_join_roles: string[];
    ai_onboarding_enabled: boolean;
    ai_onboarding_questions: string[];
    ai_onboarding_roles: AiRoleMapping[];
}

interface DiscordChannel { id: string; name: string; type: number; }
interface DiscordRole { id: string; name: string; }

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

function WelcomePageContent({ isPremium, serverId }: { isPremium: boolean, serverId: string }) {
    const { toast } = useToast();

    const [welcomeConfig, setWelcomeConfig] = useState<WelcomeConfig | null>(null);
    const [autorolesConfig, setAutorolesConfig] = useState<AutorolesConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [welcomeRes, autorolesRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/welcome-message`),
                    fetch(`${API_URL}/get-config/${serverId}/autoroles`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                const welcomeData = await welcomeRes.json();
                const autorolesData = await autorolesRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                
                setWelcomeConfig(welcomeData);
                setAutorolesConfig(autorolesData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
                setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));

            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger les configurations.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveWelcomeConfig = async (newConfig: WelcomeConfig) => {
        setWelcomeConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/welcome-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const saveAutorolesConfig = async (newConfig: AutorolesConfig) => {
        setAutorolesConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/autoroles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleWelcomeChange = (key: keyof WelcomeConfig, value: any) => {
        if (!welcomeConfig) return;
        saveWelcomeConfig({ ...welcomeConfig, [key]: value });
    };
    
    const handleAutorolesChange = (key: keyof AutorolesConfig, value: any) => {
        if (!autorolesConfig) return;
        saveAutorolesConfig({ ...autorolesConfig, [key]: value });
    };
    
    if (loading || !welcomeConfig || !autorolesConfig) {
        return <PageSkeleton />;
    }

    const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));
    const channelOptions = [
        { value: 'none', label: 'Désactivé' },
        ...channels.map(channel => ({ value: channel.id, label: `# ${channel.name}` }))
    ];

    return (
        <PageTransitionWrapper className="space-y-8 max-w-4xl">
            <GlobalAiStatusAlert />
            <Card>
                <CardHeader>
                    <CardTitle>Message de Bienvenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enable-welcome" className="font-bold">Activer le message de bienvenue</Label>
                        <Switch id="enable-welcome" checked={welcomeConfig.enabled} onCheckedChange={(val) => handleWelcomeChange('enabled', val)} />
                    </div>
                     <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label htmlFor="welcome-channel">Salon de bienvenue</Label>
                           <Combobox
                                options={channelOptions}
                                value={welcomeConfig.welcome_channel_id || 'none'}
                                onChange={(value) => handleWelcomeChange('welcome_channel_id', value === 'none' ? null : value)}
                                placeholder="Sélectionner un salon"
                                searchPlaceholder='Rechercher un salon...'
                                emptyPlaceholder='Aucun salon trouvé.'
                            />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                             <div className="flex items-center space-x-2">
                                <Switch id="send-dm" checked={welcomeConfig.send_in_dm} onCheckedChange={(val) => handleWelcomeChange('send_in_dm', val)} />
                                <Label htmlFor="send-dm">Envoyer aussi en message privé</Label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="welcome-message">Message d'accompagnement</Label>
                        <p className="text-sm text-muted-foreground">Utilisez {"{user}"} pour mentionner le nouveau membre. Sera affiché avec la carte.</p>
                        <Textarea id="welcome-message" defaultValue={welcomeConfig.welcome_message} onBlur={(e) => handleWelcomeChange('welcome_message', e.target.value)} />
                    </div>
                    <Separator/>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="use-card" className="font-bold">Utiliser une carte d'image</Label>
                        <Switch id="use-card" checked={welcomeConfig.use_card} onCheckedChange={(val) => handleWelcomeChange('use_card', val)} />
                    </div>
                     {welcomeConfig.use_card && (
                        <div className="space-y-4 border p-4 rounded-lg">
                             <div className="space-y-2">
                                <Label>URL de l'image de fond</Label>
                                <Input placeholder="https://example.com/image.png" defaultValue={welcomeConfig.card_background_url || ''} onBlur={(e) => handleWelcomeChange('card_background_url', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Couleur du texte principal</Label>
                                <Input type="color" defaultValue={welcomeConfig.card_text_color || '#FFFFFF'} onBlur={(e) => handleWelcomeChange('card_text_color', e.target.value)} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex items-center justify-between">
                         <CardTitle>Rôles Automatiques</CardTitle>
                        <Switch id="enable-autoroles" checked={autorolesConfig.enabled} onCheckedChange={(val) => handleAutorolesChange('enabled', val)} />
                    </div>
                     <CardDescription>Attribuez automatiquement des rôles à l'arrivée ou lors de la connexion en vocal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="join-roles" className="font-bold">Rôles à l'arrivée</Label>
                         <p className="text-sm text-muted-foreground">Rôles à attribuer quand un membre rejoint le serveur.</p>
                        <MultiSelectCombobox
                            options={roleOptions}
                            selected={autorolesConfig.on_join_roles || []}
                            onSelectedChange={(selected) => handleAutorolesChange('on_join_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                    <Separator/>
                     <div className="space-y-2">
                        <Label htmlFor="voice-roles" className="font-bold flex items-center gap-2"><Voicemail/>Rôles en vocal</Label>
                        <p className="text-sm text-muted-foreground">Rôles attribués quand un membre rejoint un salon vocal, et retirés quand il quitte.</p>
                        <MultiSelectCombobox
                            options={roleOptions}
                            selected={autorolesConfig.on_voice_join_roles || []}
                            onSelectedChange={(selected) => handleAutorolesChange('on_voice_join_roles', selected)}
                            placeholder="Sélectionner des rôles..."
                        />
                    </div>
                </CardContent>
            </Card>

            <PremiumFeatureWrapper isPremium={isPremium}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><BrainCircuit/> Intégration par Questionnaire IA <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge></CardTitle>
                            <Switch id="enable-ai-onboarding" checked={autorolesConfig.ai_onboarding_enabled} onCheckedChange={(val) => handleAutorolesChange('ai_onboarding_enabled', val)} />
                        </div>
                        <CardDescription>Le bot posera des questions en message privé à l'arrivée d'un membre pour lui attribuer des rôles en fonction de ses réponses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label className="font-semibold text-lg">Questions</Label>
                            <p className="text-sm text-muted-foreground">Listez ici les questions que le bot posera au nouvel utilisateur. (Une par ligne)</p>
                            <Textarea 
                                className="mt-2"
                                placeholder={`Exemple :\nQuel est votre jeu principal ?\nPréférez-vous le PVE ou le PVP ?`}
                                value={(autorolesConfig.ai_onboarding_questions || []).join('\n')}
                                onChange={(e) => handleAutorolesChange('ai_onboarding_questions', e.target.value.split('\n'))}
                                rows={4}
                            />
                        </div>
                        <div>
                             <Label className="font-semibold text-lg">Assignation des Rôles</Label>
                             <p className="text-sm text-muted-foreground">Associez des mots-clés aux rôles. Si l'IA trouve un mot-clé dans les réponses de l'utilisateur, le rôle associé sera attribué.</p>
                             <div className="space-y-4 mt-2">
                                { (autorolesConfig.ai_onboarding_roles || []).map((mapping, index) => (
                                    <div key={mapping.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center p-4 border rounded-lg bg-card-foreground/5">
                                        <Combobox
                                            options={roleOptions.map(r => ({ value: r.id, label: `@${r.name}`}))}
                                            value={mapping.role_id}
                                            onChange={(val) => {
                                                const newMappings = [...autorolesConfig.ai_onboarding_roles];
                                                newMappings[index].role_id = val;
                                                handleAutorolesChange('ai_onboarding_roles', newMappings);
                                            }}
                                            placeholder="Choisir un rôle..."
                                            searchPlaceholder="Rechercher un rôle..."
                                        />
                                        <div className="md:col-span-2 flex items-center gap-2">
                                            <Input
                                                placeholder="Mots-clés séparés par des virgules"
                                                value={mapping.keywords.join(', ')}
                                                onChange={(e) => {
                                                    const newMappings = [...autorolesConfig.ai_onboarding_roles];
                                                    newMappings[index].keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                                                    handleAutorolesChange('ai_onboarding_roles', newMappings);
                                                }}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                handleAutorolesChange('ai_onboarding_roles', autorolesConfig.ai_onboarding_roles.filter(m => m.id !== mapping.id));
                                            }}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                        </div>
                                    </div>
                                )) }
                                <Button variant="outline" className="w-full" onClick={() => {
                                    const newMapping: AiRoleMapping = { id: uuidv4(), role_id: '', keywords: [] };
                                    handleAutorolesChange('ai_onboarding_roles', [...(autorolesConfig.ai_onboarding_roles || []), newMapping]);
                                }}>
                                    <PlusCircle className="mr-2"/>Ajouter une association
                                </Button>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </PremiumFeatureWrapper>
        </PageTransitionWrapper>
    );
}


export default function WelcomePage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { serverInfo, loading } = useServerInfo();
    
    return (
        <PageTransitionWrapper className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><UserPlus/> Accueil & Intégration</h1>
                <p className="text-muted-foreground mt-2">
                Configurez une expérience d'arrivée fluide pour vos nouveaux membres.
                </p>
            </div>
            <Separator />
            {loading ? <PageSkeleton/> : <WelcomePageContent isPremium={serverInfo?.isPremium || false} serverId={serverId} />}
        </PageTransitionWrapper>
    );
}

if (typeof window !== 'undefined' && !(window as any).uuidv4) {
    (window as any).uuidv4 = uuidv4;
}
