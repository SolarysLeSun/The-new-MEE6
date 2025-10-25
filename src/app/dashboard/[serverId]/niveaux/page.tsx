

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Settings, MessageSquare, Mic, MousePointerClick, Video, Award, Gem, Shield, Handshake, AlertTriangle, ShoppingCart } from 'lucide-react';
import type { RoleReward, XPBoost, LevelingConfig, AntiAfkConfig, ShopItem } from '@/types';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';


const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}
interface DiscordRole {
    id: string;
    name: string;
}

const levelingCommands = [
    { name: '/level', key: 'level', description: 'Affiche le niveau et l\'XP d\'un utilisateur.' },
    { name: '/topxp', key: 'topxp', description: 'Affiche le classement du serveur.' },
    { name: '/webleaderboard', key: 'webleaderboard', description: 'Donne le lien du classement en ligne.' },
];

function PageSkeleton() {
    return <Skeleton className="h-screen w-full" />;
}

export default function LevelingPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<LevelingConfig | null>(null);
    const [antiAfkConfig, setAntiAfkConfig] = useState<AntiAfkConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!serverId) return;
        setLoading(true);
        try {
            const [configRes, serverDetailsRes, antiAfkRes] = await Promise.all([
                fetch(`${API_URL}/get-config/${serverId}/leveling`),
                fetch(`${API_URL}/get-server-details/${serverId}`),
                fetch(`${API_URL}/get-config/${serverId}/anti-afk`),
            ]);
            if (!configRes.ok || !serverDetailsRes.ok || !antiAfkRes.ok) throw new Error('Failed to fetch data');
            
            const configData = await configRes.json();
            const serverDetailsData = await serverDetailsRes.json();
            const antiAfkData = await antiAfkRes.json();

            setConfig(configData);
            setAntiAfkConfig(antiAfkData);
            setChannels(serverDetailsData.channels);
            setRoles(serverDetailsData.roles);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [serverId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveConfig = async (newConfig: LevelingConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/leveling`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleValueChange = (key: keyof LevelingConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };

    const handleListChange = useCallback(<T extends RoleReward | XPBoost | ShopItem>(
        key: 'role_rewards' | 'xp_boost_roles' | 'xp_boost_channels' | 'shop_items',
        index: number,
        field: keyof T,
        value: string | number
    ) => {
        if (!config) return;
        const list = [...(config[key] as T[] || [])];
        (list[index] as any)[field] = value;
        handleValueChange(key, list);
    }, [config]);
    
    const addListItem = useCallback((key: 'role_rewards' | 'xp_boost_roles' | 'xp_boost_channels' | 'shop_items') => {
        if (!config) return;
        const list = [...(config[key] as any[] || [])];
        let newItem: any = {};
        if (key === 'role_rewards') newItem = { level: 1, role_id: '' };
        if (key === 'xp_boost_roles') newItem = { role_id: '', multiplier: 1.5 };
        if (key === 'xp_boost_channels') newItem = { channel_id: '', multiplier: 1.5 };
        if (key === 'shop_items') newItem = { id: uuidv4(), name: 'Nouvel Article', description: '', price: 100, type: 'custom', reward_id: '' };
        handleValueChange(key, [...list, newItem]);
    }, [config]);
    
    const removeListItem = useCallback((key: 'role_rewards' | 'xp_boost_roles' | 'xp_boost_channels' | 'shop_items', index: number) => {
        if (!config) return;
        const list = [...(config[key] as any[] || [])];
        list.splice(index, 1);
        handleValueChange(key, list);
    }, [config]);

     const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleValueChange('command_permissions', newPermissions);
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }
    
    const textChannelOptions = channels.filter(c => c.type === 0).map(c => ({ value: c.id, label: `# ${c.name}` }));
    const allChannelOptions = channels.map(c => ({ value: c.id, label: `${c.type === 2 ? '🔊' : '#'} ${c.name}` }));
    const roleOptions = roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: `@${r.name}` }));
    
    const showAntiAfkAlert = (config.xp_per_minute_in_voice > 0) && !antiAfkConfig?.enabled;

    return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Système de Niveaux</h1>
            <p className="text-muted-foreground mt-2">
                Configurez l'engagement de votre communauté en récompensant l'activité.
            </p>
        </div>
        <Separator />

        {showAntiAfkAlert && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Recommandation de Sécurité</AlertTitle>
                <AlertDescription>
                    Le gain d'XP en vocal est activé, mais le module Anti-AFK est désactivé. Il est fortement recommandé de l'activer pour empêcher les membres de gagner de l'XP sans être actifs.
                    <Link href={`/dashboard/${serverId}/anti-afk`}>
                        <Button variant="link" className="p-0 h-auto ml-2">Activer l'Anti-AFK</Button>
                    </Link>
                </AlertDescription>
            </Alert>
        )}
        
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Settings/>Configuration Générale</CardTitle>
                    <Switch checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
                </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Salons ignorés</Label>
                    <p className="text-sm text-muted-foreground">L'XP ne sera pas attribuée dans les salons sélectionnés.</p>
                     <MultiSelectCombobox
                        options={allChannelOptions}
                        selected={config.ignored_channels || []}
                        onSelectedChange={(selected) => handleValueChange('ignored_channels', selected)}
                        placeholder="Sélectionner des salons à ignorer..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Difficulté de progression</Label>
                    <p className="text-sm text-muted-foreground">Ajuste la quantité d'XP requise pour chaque niveau.</p>
                    <Select value={config.difficulty || 'medium'} onValueChange={(val: 'easy' | 'medium' | 'hard' | 'arcade') => handleValueChange('difficulty', val)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Facile</SelectItem>
                            <SelectItem value="medium">Moyen</SelectItem>
                            <SelectItem value="hard">Difficile</SelectItem>
                            <SelectItem value="arcade">Arcade (250 XP/niveau)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="gains">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="gains">Gains d'XP</TabsTrigger>
                <TabsTrigger value="recompenses">Récompenses & Boosts</TabsTrigger>
                <TabsTrigger value="boutique">Boutique</TabsTrigger>
                <TabsTrigger value="personnalisation">Personnalisation</TabsTrigger>
                <TabsTrigger value="commandes">Commandes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gains">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration des Gains d'XP</CardTitle>
                        <CardDescription>Définissez comment les membres gagnent de l'expérience sur votre serveur.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><MessageSquare/>XP par message</Label>
                                <Input type="number" defaultValue={config.xp_per_message} onBlur={(e) => handleValueChange('xp_per_message', parseInt(e.target.value))} />
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Mic/>XP par minute en vocal</Label>
                                <Input type="number" defaultValue={config.xp_per_minute_in_voice} onBlur={(e) => handleValueChange('xp_per_minute_in_voice', parseInt(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><MousePointerClick/>XP par réaction</Label>
                                <Input type="number" defaultValue={config.xp_per_reaction} onBlur={(e) => handleValueChange('xp_per_reaction', parseInt(e.target.value))} />
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Handshake/>XP par réaction bienvenue</Label>
                                <Input type="number" defaultValue={config.xp_per_welcome_reaction} onBlur={(e) => handleValueChange('xp_per_welcome_reaction', parseInt(e.target.value))} />
                            </div>
                         </div>
                         <Separator/>
                         <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Video/>Multiplicateur XP (Webcam)</Label>
                                <Input type="number" step="0.1" defaultValue={config.xp_boost_webcam_multiplier} onBlur={(e) => handleValueChange('xp_boost_webcam_multiplier', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cooldown entre les messages (secondes)</Label>
                                <Input type="number" defaultValue={config.cooldown_seconds} onBlur={(e) => handleValueChange('cooldown_seconds', parseInt(e.target.value))} />
                            </div>
                         </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="recompenses">
                <div className="grid lg:grid-cols-2 gap-8">
                     <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gem/>Rôles Récompenses</CardTitle>
                            <CardDescription>Attribuez des rôles automatiquement lorsque les membres atteignent un certain niveau.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow">
                            {(config.role_rewards || []).map((reward, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                                    <div className="w-full sm:w-24">
                                        <Label className="text-xs">Niveau</Label>
                                        <Input type="number" placeholder="Niv." defaultValue={reward.level} onChange={e => handleListChange('role_rewards', index, 'level', parseInt(e.target.value))} />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Rôle</Label>
                                        <Combobox options={roleOptions} value={reward.role_id} onChange={val => handleListChange('role_rewards', index, 'role_id', val)} placeholder="Sélectionner un rôle..." />
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeListItem('role_rewards', index)}><Trash2 className="text-destructive"/></Button>
                                </div>
                            ))}
                        </CardContent>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => addListItem('role_rewards')}><PlusCircle /> Ajouter une récompense</Button>
                        </CardContent>
                    </Card>
                     <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield/>Boosts d'XP</CardTitle>
                             <CardDescription>Donnez plus d'XP aux membres ayant certains rôles ou parlant dans certains salons.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow">
                             {(config.xp_boost_roles || []).map((boost, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                                    <div className="flex-1">
                                         <Label className="text-xs">Rôle</Label>
                                         <Combobox options={roleOptions} value={boost.role_id || ''} onChange={val => handleListChange('xp_boost_roles', index, 'role_id', val)} placeholder="Sélectionner un rôle..." />
                                    </div>
                                    <div className="w-full sm:w-28">
                                        <Label className="text-xs">Multiplicateur</Label>
                                        <Input type="number" step="0.1" placeholder="Ex: 1.5" defaultValue={boost.multiplier} onChange={e => handleListChange('xp_boost_roles', index, 'multiplier', parseFloat(e.target.value))} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeListItem('xp_boost_roles', index)}><Trash2 className="text-destructive"/></Button>
                                </div>
                            ))}
                             {(config.xp_boost_channels || []).map((boost, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                                     <div className="flex-1">
                                         <Label className="text-xs">Salon</Label>
                                        <Combobox options={allChannelOptions} value={boost.channel_id || ''} onChange={val => handleListChange('xp_boost_channels', index, 'channel_id', val)} placeholder="Sélectionner un salon..." />
                                    </div>
                                     <div className="w-full sm:w-28">
                                        <Label className="text-xs">Multiplicateur</Label>
                                        <Input type="number" step="0.1" placeholder="Ex: 1.5" defaultValue={boost.multiplier} onChange={e => handleListChange('xp_boost_channels', index, 'multiplier', parseFloat(e.target.value))} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeListItem('xp_boost_channels', index)}><Trash2 className="text-destructive"/></Button>
                                </div>
                            ))}
                        </CardContent>
                        <CardContent>
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full"><PlusCircle />Ajouter un boost</Button></PopoverTrigger>
                                <PopoverContent className="w-56 p-0">
                                    <div className="flex flex-col">
                                        <Button variant="ghost" onClick={() => addListItem('xp_boost_roles')}>Boost de Rôle</Button>
                                        <Button variant="ghost" onClick={() => addListItem('xp_boost_channels')}>Boost de Salon</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            
            <TabsContent value="boutique">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShoppingCart /> Boutique d'XP</CardTitle>
                        <CardDescription>Permettez à vos membres d'échanger leur XP contre des récompenses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="shop-enabled" className="font-semibold">Activer la boutique</Label>
                            <Switch id="shop-enabled" checked={config.shop_enabled ?? false} onCheckedChange={(val) => handleValueChange('shop_enabled', val)} />
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Salon de notification des achats</Label>
                                <Combobox options={textChannelOptions} value={config.shop_notification_channel_id || ''} onChange={(val) => handleValueChange('shop_notification_channel_id', val)} placeholder="Aucun" />
                            </div>
                             <div className="space-y-2">
                                <Label>Rôle à mentionner</Label>
                                <Combobox options={roleOptions} value={config.shop_notification_role_id || ''} onChange={(val) => handleValueChange('shop_notification_role_id', val)} placeholder="Aucun" />
                            </div>
                        </div>
                         <Separator />
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Articles de la Boutique</h3>
                            <div className="space-y-4">
                                {(config.shop_items || []).map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-lg bg-card-foreground/5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
                                                <div className="space-y-1">
                                                    <Label>Nom d'affichage</Label>
                                                    <Input value={item.name} placeholder="Ex: Rôle VIP" onChange={e => handleListChange('shop_items', index, 'name', e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>ID unique (pour /acheter)</Label>
                                                    <Input value={item.id} placeholder="Ex: vip-role" onChange={e => handleListChange('shop_items', index, 'id', e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>Prix (XP)</Label>
                                                    <Input type="number" value={item.price} placeholder="Ex: 10000" onChange={e => handleListChange('shop_items', index, 'price', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>Description</Label>
                                                    <Input value={item.description} placeholder="Ex: Donne accès aux salons VIP" onChange={e => handleListChange('shop_items', index, 'description', e.target.value)} />
                                                </div>
                                                 <div className="space-y-1">
                                                    <Label>Type de récompense</Label>
                                                    <Select value={item.type} onValueChange={(val: 'role'|'custom') => handleListChange('shop_items', index, 'type', val)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="custom">Personnalisé (notification)</SelectItem>
                                                            <SelectItem value="role">Rôle Automatique</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                 <div className="space-y-1">
                                                    <Label>Récompense (ID de rôle)</Label>
                                                    <Combobox options={roleOptions} value={item.reward_id} onChange={(val) => handleListChange('shop_items', index, 'reward_id', val)} placeholder="Choisir un rôle..." disabled={item.type !== 'role'} />
                                                </div>
                                            </div>
                                             <Button variant="ghost" size="icon" onClick={() => removeListItem('shop_items', index)}><Trash2 className="text-destructive"/></Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full" onClick={() => addListItem('shop_items')}>
                                    <PlusCircle className="mr-2"/> Ajouter un article
                                </Button>
                            </div>
                         </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="personnalisation">
                 <Card>
                    <CardHeader>
                        <CardTitle>Personnalisation</CardTitle>
                        <CardDescription>Configurez l'apparence des annonces et de la carte de niveau.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Salon des annonces de montée de niveau</Label>
                            <Combobox options={textChannelOptions} value={config.level_up_channel_id || ''} onChange={(val) => handleValueChange('level_up_channel_id', val)} placeholder="Utiliser le salon actuel" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="mention-user" className="font-bold">Mentionner l'utilisateur</Label>
                                <p className="text-sm text-muted-foreground">Envoyer un ping à l'utilisateur dans le message de montée de niveau.</p>
                            </div>
                            <Switch
                                id="mention-user"
                                checked={config.mention_user_on_levelup ?? true}
                                onCheckedChange={(val) => handleValueChange('mention_user_on_levelup', val)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Fréquence des annonces</Label>
                            <p className="text-sm text-muted-foreground">Annoncer la montée de niveau tous les X niveaux. (1 = à chaque niveau, 0 = jamais)</p>
                            <Input type="number" min="0" defaultValue={config.level_up_frequency} onBlur={(e) => handleValueChange('level_up_frequency', parseInt(e.target.value))} className="w-24"/>
                        </div>
                        <Separator/>
                         <div className="space-y-2">
                            <Label>URL de l'image de fond pour la carte de niveau</Label>
                            <Input placeholder="https://example.com/background.png" defaultValue={config.level_card_background_url || ''} onBlur={(e) => handleValueChange('level_card_background_url', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Couleur de la barre d'XP</Label>
                                <Input type="color" defaultValue={config.level_card_bar_color || '#FFFFFF'} onBlur={(e) => handleValueChange('level_card_bar_color', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label>Couleur du texte de la carte</Label>
                                <Input type="color" defaultValue={config.level_card_text_color || '#FFFFFF'} onBlur={(e) => handleValueChange('level_card_text_color', e.target.value)} />
                            </div>
                        </div>
                     </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="commandes">
                <Card>
                    <CardHeader>
                        <CardTitle>Commandes</CardTitle>
                        <CardDescription>Gérez les permissions des commandes liées au système de niveaux.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {levelingCommands.map(command => (
                            <div key={command.key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                <div className="flex-1">
                                    <h3 className="font-semibold">{command.name}</h3>
                                    <p className="text-sm text-muted-foreground">{command.description}</p>
                                </div>
                                <div className="w-full sm:w-56">
                                    <Combobox
                                        options={[ { value: 'none', label: '@everyone' }, ...roleOptions]}
                                        value={config.command_permissions?.[command.key] || 'none'}
                                        onChange={(value) => handlePermissionChange(command.key, value)}
                                        placeholder="Sélectionner un rôle"
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

    </PageTransitionWrapper>
  )
}
