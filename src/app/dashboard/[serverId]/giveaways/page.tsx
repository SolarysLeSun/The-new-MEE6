
'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, Gift, Trophy, PlusCircle } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function GiveawaysPage() {
  // Mock data - this will come from DB later
  const [giveaways, setGiveaways] = useState<any[]>([]); 

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <div className="flex items-center justify-between">
            <div>
                 <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Gift /> Giveaways (Concours)
                    <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
                </h1>
                <p className="text-muted-foreground mt-2">
                Créez, gérez et programmez des concours pour votre communauté.
                </p>
            </div>
            <CreateGiveawayDialog />
        </div>
      </div>
      
      <Separator />

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
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2"/>
                    Créer un giveaway
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                 <DialogHeader>
                    <DialogTitle>Nouveau Giveaway</DialogTitle>
                    <DialogDescription>Configurez les détails de votre nouveau concours.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="prize">Prix à gagner</Label>
                        <Input id="prize" placeholder="Ex: Rôle VIP, 1000 XP, un jeu Steam..." value={prize} onChange={(e) => setPrize(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="reward-type">Type de récompense</Label>
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
                            <p className="text-sm text-muted-foreground">Sélection du rôle (à venir)</p>
                         ) : rewardType === 'xp' ? (
                             <Input id="reward-value" type="number" placeholder="Ex: 1000" value={rewardValue} onChange={e => setRewardValue(e.target.value)} />
                         ) : (
                             <Input id="reward-value" placeholder="Ex: Contactez @Admin pour réclamer." value={rewardValue} onChange={e => setRewardValue(e.target.value)} />
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
