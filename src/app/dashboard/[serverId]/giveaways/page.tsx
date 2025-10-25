

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Gift, Trophy, PlusCircle, Calendar, Clock, Repeat } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface Giveaway {
  id: string;
  prize: string;
  status: 'active' | 'scheduled' | 'ended';
  ends_at: string;
  winner_count: number;
}
interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}
interface GiveawaysConfig {
    enabled: boolean;
    default_channel_id: string | null;
    command_permissions: { [key: string]: string | null };
}

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

export default function GiveawaysPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const { toast } = useToast();

  const [config, setConfig] = useState<GiveawaysConfig | null>(null);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]); 
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serverId) return;
    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, serverDetailsRes] = await Promise.all([
                fetch(`${API_URL}/get-config/${serverId}/giveaways`),
                fetch(`${API_URL}/get-server-details/${serverId}`)
            ]);
            if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');

            const configData = await configRes.json();
            const serverDetailsData = await serverDetailsRes.json();
            
            setConfig(configData);
            setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0));
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de charger la configuration des giveaways.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [serverId, toast]);

  const saveConfig = async (newConfig: GiveawaysConfig) => {
    setConfig(newConfig);
    try {
        await fetch(`${API_URL}/update-config/${serverId}/giveaways`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig),
        });
    } catch (error) {
        toast({ title: "Erreur de sauvegarde", variant: "destructive" });
    }
  };

  const handleValueChange = (key: keyof GiveawaysConfig, value: any) => {
    if (!config) return;
    saveConfig({ ...config, [key]: value });
  };
  
  if (loading || !config) {
      return <Skeleton className="h-96 w-full"/>
  }

  const channelOptions = channels.map(c => ({ value: c.id, label: `# ${c.name}` }));

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <div className="flex items-center justify-between">
            <div>
                 <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Gift /> Giveaways (Concours)
                </h1>
                <p className="text-muted-foreground mt-2">
                Créez, gérez et programmez des concours pour votre communauté.
                </p>
            </div>
            <CreateGiveawayDialog />
        </div>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
            <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
                <Label htmlFor="enable-module" className="font-bold">Activer le module Giveaway</Label>
                <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
            </div>
            <Separator/>
            <div className="space-y-2">
                <Label>Salon par défaut des giveaways</Label>
                <p className="text-sm text-muted-foreground">Les giveaways programmés seront publiés dans ce salon.</p>
                <Combobox
                    options={[{ value: 'none', label: 'Aucun' }, ...channelOptions]}
                    value={config.default_channel_id || 'none'}
                    onChange={(value) => handleValueChange('default_channel_id', value === 'none' ? null : value)}
                    placeholder="Sélectionner un salon..."
                    searchPlaceholder="Rechercher..."
                />
            </div>
        </CardContent>
      </Card>

        {giveaways.length === 0 ? (
            <Card className="text-center py-12 border-2 border-dashed rounded-lg">
                <CardHeader>
                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun concours pour le moment</h3>
                </CardHeader>
                <CardContent>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Utilisez le bouton "Créer un giveaway" pour commencer.
                    </p>
                </CardContent>
            </Card>
        ) : (
            <div className="grid md:grid-cols-2 gap-4">
            {/* Giveaway list will be mapped here */}
            </div>
        )}
    </PageTransitionWrapper>
  );
}

function CreateGiveawayDialog() {
    const [prize, setPrize] = useState('');
    const [rewardType, setRewardType] = useState('custom');
    const [rewardValue, setRewardValue] = useState('');
    const [winnerCount, setWinnerCount] = useState(1);
    const [scheduleType, setScheduleType] = useState('now');
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
    const [scheduleTime, setScheduleTime] = useState('18:00');
    const [scheduleDay, setScheduleDay] = useState('monday');
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2"/>
                    Créer un giveaway
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                 <DialogHeader>
                    <DialogTitle>Nouveau Giveaway</DialogTitle>
                    <DialogDescription>Configurez les détails de votre nouveau concours.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="prize">Prix à gagner</Label>
                        <Input id="prize" placeholder="Ex: Rôle VIP, 1000 XP, un jeu Steam..." value={prize} onChange={(e) => setPrize(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="reward-type">Type de récompense auto.</Label>
                            <Select value={rewardType} onValueChange={setRewardType}>
                                <SelectTrigger id="reward-type">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Personnalisé (texte)</SelectItem>
                                    <SelectItem value="role">Rôle</SelectItem>
                                    <SelectItem value="xp">XP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="winner-count">Nombre de gagnants</Label>
                            <Input id="winner-count" type="number" min="1" value={winnerCount} onChange={e => setWinnerCount(parseInt(e.target.value) || 1)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reward-value">
                            {rewardType === 'role' && "Rôle à donner"}
                            {rewardType === 'xp' && "Montant d'XP"}
                            {rewardType === 'custom' && "Message pour le gagnant"}
                        </Label>
                         {rewardType === 'role' ? (
                            <p className="text-sm text-muted-foreground pt-2">Sélection du rôle (à venir)</p>
                         ) : rewardType === 'xp' ? (
                             <Input id="reward-value" type="number" placeholder="Ex: 1000" value={rewardValue} onChange={e => setRewardValue(e.target.value)} />
                         ) : (
                             <Input id="reward-value" placeholder="Ex: Contactez @Admin pour réclamer." value={rewardValue} onChange={e => setRewardValue(e.target.value)} />
                         )}
                    </div>
                    
                    <Separator/>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Programmation</h4>
                        <Select value={scheduleType} onValueChange={setScheduleType}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="now">Lancer maintenant (via commande)</SelectItem>
                                <SelectItem value="once">Programmer une fois</SelectItem>
                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                            </SelectContent>
                        </Select>

                        {scheduleType === 'once' && (
                             <div className="grid grid-cols-2 gap-4">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "justify-start text-left font-normal",
                                                !scheduleDate && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {scheduleDate ? format(scheduleDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarIcon
                                            mode="single"
                                            selected={scheduleDate}
                                            onSelect={setScheduleDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                             </div>
                        )}
                        {scheduleType === 'weekly' && (
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={scheduleDay} onValueChange={setScheduleDay}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monday">Lundi</SelectItem>
                                        <SelectItem value="tuesday">Mardi</SelectItem>
                                        <SelectItem value="wednesday">Mercredi</SelectItem>
                                        <SelectItem value="thursday">Jeudi</SelectItem>
                                        <SelectItem value="friday">Vendredi</SelectItem>
                                        <SelectItem value="saturday">Samedi</SelectItem>
                                        <SelectItem value="sunday">Dimanche</SelectItem>
                                    </SelectContent>
                                </Select>
                                 <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Annuler</Button>
                    </DialogClose>
                     <Button type="submit" disabled>Enregistrer (à venir)</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
