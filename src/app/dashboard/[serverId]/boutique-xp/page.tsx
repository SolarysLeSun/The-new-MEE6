
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Store, PlusCircle, Trash2, BadgeDollarSign, UserCheck, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import type { XpShopConfig, ShopItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel { id: string; name: string; type: number; }
interface DiscordRole { id: string; name: string; }

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
            <Card><CardHeader><Skeleton className="h-48 w-full" /></CardHeader></Card>
        </div>
    );
}

export default function XpShopPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<XpShopConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/xp-shop`),
                    fetch(`${API_URL}/get-server-details/${serverId}`),
                ]);
                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();
                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
                setRoles(serverDetailsData.roles.filter((r: DiscordRole) => r.name !== '@everyone'));
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration de la boutique.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: XpShopConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/xp-shop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleAddItem = () => {
        if (!config) return;
        const newItem: ShopItem = {
            id: `item-${uuidv4().slice(0, 4)}`,
            name: 'Nouvel Article',
            description: 'Description de l\'article',
            cost: 1000,
            type: 'custom',
            value: 'item_custom',
        };
        saveConfig({ ...config, items: [...(config.items || []), newItem] });
    };

    const handleUpdateItem = (index: number, updatedItem: Partial<ShopItem>) => {
        if (!config) return;
        const newItems = [...config.items];
        newItems[index] = { ...newItems[index], ...updatedItem };
        saveConfig({ ...config, items: newItems });
    };

    const handleDeleteItem = (id: string) => {
        if (!config) return;
        saveConfig({ ...config, items: config.items.filter(item => item.id !== id) });
    };

    if (loading || !config) {
        return <PageSkeleton />;
    }

    const channelOptions = [{ value: 'none', label: 'Ne pas notifier' }, ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))];
    const roleOptions = [{ value: 'none', label: 'Ne pas mentionner' }, ...roles.map(r => ({ value: r.id, label: `@${r.name}` }))];

    return (
        <PageTransitionWrapper className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Store /> Boutique d'XP</h1>
                <p className="text-muted-foreground mt-2">
                    Créez une boutique où vos membres peuvent dépenser l'XP qu'ils ont durement gagnée.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings/>Configuration Générale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enable-shop" className="font-bold">Activer la boutique</Label>
                        <Switch id="enable-shop" checked={config.enabled} onCheckedChange={(val) => saveConfig({...config, enabled: val})} />
                    </div>
                    <Separator/>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Salon de notification (achats personnalisés)</Label>
                            <Combobox
                                options={channelOptions}
                                value={config.log_channel_id || 'none'}
                                onChange={(value) => saveConfig({...config, log_channel_id: value === 'none' ? null : value})}
                                placeholder="Sélectionner un salon..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rôle à mentionner</Label>
                            <Combobox
                                options={roleOptions}
                                value={config.mention_role_id || 'none'}
                                onChange={(value) => saveConfig({...config, mention_role_id: value === 'none' ? null : value})}
                                placeholder="Sélectionner un rôle..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Articles de la Boutique</CardTitle>
                    <CardDescription>Gérez les articles que vos membres peuvent acheter avec leur XP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {config.items.map((item, index) => (
                        <Card key={item.id} className="bg-background/50">
                            <CardHeader className="flex flex-row items-start justify-between">
                                <Input value={item.name} onChange={(e) => handleUpdateItem(index, { name: e.target.value })} className="text-lg font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent w-auto" />
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input value={item.description} onChange={(e) => handleUpdateItem(index, { description: e.target.value })} placeholder="Petite description de l'article" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>ID d'Achat</Label>
                                        <Input value={item.id} onChange={(e) => handleUpdateItem(index, { id: e.target.value.toLowerCase().replace(/\s/g, '-') })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Coût en XP</Label>
                                        <Input type="number" value={item.cost} onChange={(e) => handleUpdateItem(index, { cost: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={item.type} onValueChange={(val: 'role' | 'custom') => handleUpdateItem(index, { type: val })}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="role">Rôle</SelectItem>
                                                <SelectItem value="custom">Personnalisé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Récompense</Label>
                                        {item.type === 'role' ? (
                                            <Combobox options={roles.map(r => ({value: r.id, label: r.name}))} value={item.value} onChange={val => handleUpdateItem(index, {value: val})} placeholder="Choisir un rôle"/>
                                        ) : (
                                            <Input value={item.value} onChange={e => handleUpdateItem(index, {value: e.target.value})} placeholder="Nom de l'objet (ex: cles_premium)" />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button variant="outline" className="w-full" onClick={handleAddItem}><PlusCircle className="mr-2"/>Ajouter un article</Button>
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}

if (typeof window !== 'undefined' && !(window as any).uuidv4) {
    (window as any).uuidv4 = uuidv4;
}
