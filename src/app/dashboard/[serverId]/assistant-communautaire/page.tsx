

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MessageSquare, Trash2, PlusCircle, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { KnowledgeBaseItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useServerInfo } from '@/hooks/use-server-info';
import { PremiumFeatureWrapper } from '@/components/premium-wrapper';
import { Badge } from '@/components/ui/badge';
import { GlobalAiStatusAlert } from '@/components/global-ai-status-alert';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface CommunityAssistantConfig {
    enabled: boolean;
    confidence_threshold: number;
    knowledge_base: KnowledgeBaseItem[];
    command_permissions: { [key: string]: string | null };
    faq_scan_enabled: boolean;
    // New fields for scheduled suggestions
    scheduled_suggestions_enabled?: boolean;
    suggestion_frequency?: 'daily' | 'weekly' | 'disabled';
    suggestion_channel_id?: string | null;
    suggestion_tags?: string;
    suggestion_prompt?: string;
}

interface DiscordRole {
    id: string;
    name: string;
}
interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}


const faqCommand = {
    name: '/faq',
    key: 'faq',
    description: "Pose une question à l'assistant communautaire.",
};

function CommunityAssistantPageContent({ isPremium, serverId }: { isPremium: boolean, serverId: string }) {
    const { toast } = useToast();

    const [config, setConfig] = useState<CommunityAssistantConfig | null>(null);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [sliderValue, setSliderValue] = useState([75]);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/community-assistant`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch initial data');
                
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();

                setConfig(configData);
                setRoles(serverDetailsData.roles);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
                setSliderValue([configData.confidence_threshold || 75]);
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: CommunityAssistantConfig) => {
        setConfig(newConfig); // Optimistic update for UI responsiveness
        try {
            const response = await fetch(`${API_URL}/update-config/${serverId}/community-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
            if (!response.ok) throw new Error('Save failed');
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof CommunityAssistantConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handleSliderCommit = (value: number[]) => {
        handleValueChange('confidence_threshold', value[0]);
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleValueChange('command_permissions', newPermissions);
    };

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

    const roleOptions = [
        { value: 'none', label: '@everyone' },
        ...roles.filter(r => r.name !== '@everyone').map(role => ({ value: role.id, label: role.name }))
    ];
    
    const textChannelOptions = [
        { value: 'none', label: 'Aucun' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];

    return (
        <PremiumFeatureWrapper isPremium={isPremium}>
            <PageTransitionWrapper className="space-y-8">
                <GlobalAiStatusAlert />
                {/* Section Options */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">Options de la FAQ</h2>
                        <p className="text-muted-foreground">
                            Personnalisez le comportement de l'assistant communautaire.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-assistant" className="font-bold text-sm uppercase text-muted-foreground">Activer le module</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Active ou désactive complètement la commande /faq et le scan.
                                </p>
                            </div>
                            <Switch id="enable-assistant" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                        </div>
                        <Separator />
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="faq-scan" className="font-bold text-sm uppercase text-muted-foreground">Activer le scan des questions fréquentes (FAQ)</Label>
                                <p className="text-sm text-muted-foreground/80">
                                    Si activé, le bot scannera les messages et répondra automatiquement aux questions de votre base de connaissances.
                                </p>
                            </div>
                            <Switch id="faq-scan" checked={config.faq_scan_enabled} onCheckedChange={(val) => handleValueChange('faq_scan_enabled', val)} />
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <Label htmlFor="confidence-threshold" className="font-bold text-sm uppercase text-muted-foreground">Seuil de confiance</Label>
                            <p className="text-sm text-muted-foreground/80">
                                Le bot ne répondra que si sa confiance est supérieure à ce seuil.
                            </p>
                            <div className="flex items-center gap-4">
                                <Slider 
                                    id="confidence-threshold" 
                                    value={sliderValue} 
                                    onValueChange={setSliderValue}
                                    onValueCommit={handleSliderCommit}
                                    max={100} 
                                    step={1} 
                                    className="w-full" />
                                <span className="font-mono text-lg w-12 text-center">{sliderValue[0]}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                 {/* Section Suggestions Programmées */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CalendarClock/>Suggestions Programmées</CardTitle>
                        <CardDescription>Faites en sorte que l'IA anime la communauté en postant des suggestions de contenu à intervalle régulier.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="enable-scheduled-suggestions" className="font-bold">Activer les suggestions programmées</Label>
                            </div>
                            <Switch id="enable-scheduled-suggestions" checked={config.scheduled_suggestions_enabled ?? false} onCheckedChange={(val) => handleValueChange('scheduled_suggestions_enabled', val)} />
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Fréquence</Label>
                                 <Select value={config.suggestion_frequency || 'disabled'} onValueChange={(val) => handleValueChange('suggestion_frequency', val)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="disabled">Désactivé</SelectItem>
                                        <SelectItem value="daily">Journalier</SelectItem>
                                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Salon de publication</Label>
                                <Combobox
                                    options={textChannelOptions}
                                    value={config.suggestion_channel_id || 'none'}
                                    onChange={(value) => handleValueChange('suggestion_channel_id', value === 'none' ? null : value)}
                                    placeholder="Sélectionner un salon"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Thèmes / Tags des suggestions</Label>
                            <p className="text-sm text-muted-foreground/80">Séparez les thèmes par des virgules (ex: film de science-fiction, jeu de stratégie, anime des années 90).</p>
                            <Input placeholder="film de science-fiction, jeu de stratégie..." defaultValue={config.suggestion_tags} onBlur={(e) => handleValueChange('suggestion_tags', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Instructions pour l'IA</Label>
                             <p className="text-sm text-muted-foreground/80">Donnez un style à l'IA (ex: "Sois enthousiaste", "Fais une blague avant chaque suggestion").</p>
                            <Textarea placeholder="Sois toujours très enthousiaste et utilise des emojis." defaultValue={config.suggestion_prompt} onBlur={(e) => handleValueChange('suggestion_prompt', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Section Commandes */}
                <Card>
                     <CardHeader>
                        <CardTitle>Permissions de la Commande</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                             <div className="flex-1">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    <span>{faqCommand.name}</span>
                                </h3>
                                <p className="text-sm text-muted-foreground">{faqCommand.description}</p>
                            </div>
                            <div className="w-full md:w-60">
                                 <Label className="text-xs font-medium">Rôle minimum requis</Label>
                                <Combobox
                                    options={roleOptions}
                                    value={config.command_permissions?.[faqCommand.key] || 'none'}
                                    onChange={(value) => handlePermissionChange(faqCommand.key, value)}
                                    placeholder="Sélectionner un rôle"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
               

                {/* Section Questions & Réponses */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">Base de connaissances (FAQ)</h2>
                        <p className="text-muted-foreground">
                            Définissez ici les paires de questions et réponses que l'assistant utilisera pour répondre à la commande `/faq` ou au scan automatique.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {config.knowledge_base.map((item, index) => (
                        <div key={item.id} className="p-4 border rounded-lg bg-card-foreground/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Question {index + 1}</Label>
                                <Button variant="ghost" size="icon" onClick={() => removeKnowledgeBaseItem(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                            <Input 
                                placeholder="Entrez la question ou des mots-clés" 
                                defaultValue={item.question}
                                onBlur={(e) => handleKnowledgeBaseChange(index, 'question', e.target.value)}
                            />
                            <Textarea 
                                placeholder="Entrez la réponse que le bot doit fournir" 
                                defaultValue={item.answer}
                                onBlur={(e) => handleKnowledgeBaseChange(index, 'answer', e.target.value)}
                            />
                        </div>
                        ))}
                    
                        <Button variant="outline" className="w-full" onClick={addKnowledgeBaseItem}>
                            <PlusCircle className="mr-2" />
                            Ajouter une Question/Réponse
                        </Button>
                    </CardContent>
                </Card>
            </PageTransitionWrapper>
        </PremiumFeatureWrapper>
    );
}

export default function CommunityAssistantPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { serverInfo, loading } = useServerInfo();

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Assistant Communautaire
            <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Configurez l'IA pour répondre aux questions fréquentes et animer votre communauté avec des suggestions de contenu.
        </p>
      </div>
      
      <Separator />

      {loading ? (
        <PageSkeleton />
      ) : (
        <CommunityAssistantPageContent isPremium={serverInfo?.isPremium || false} serverId={serverId} />
      )}
    </PageTransitionWrapper>
  );
}


function PageSkeleton() {
    return (
        <div className="space-y-8 text-white max-w-4xl">
            <div>
                <Skeleton className="h-8 w-72 mb-2" />
                <Skeleton className="h-4 w-[500px]" />
            </div>
            <Separator />
            <Skeleton className="h-48 w-full" />
            <Separator />
            <Skeleton className="h-48 w-full" />
             <Separator />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

// Simple UUID generator for new items
// In a real app, you might use a library like `uuid`
if (typeof window !== 'undefined' && !(window as any).uuidv4) {
    (window as any).uuidv4 = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
