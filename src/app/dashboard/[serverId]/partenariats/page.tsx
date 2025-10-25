

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Handshake, Loader2, PlusCircle, Check, X, Send, Crown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { useServerInfo } from '@/hooks/use-server-info';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Partnership } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

function PartnershipPageSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
}

const statusMap: { [key: string]: { text: string; className: string } } = {
    pending: { text: "En attente", className: "bg-yellow-500/10 text-yellow-300" },
    accepted: { text: "Accepté", className: "bg-green-500/10 text-green-300" },
    terminated: { text: "Terminé", className: "bg-gray-500/10 text-gray-300" },
};


export default function PartnershipsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();
    const { serverInfo } = useServerInfo();

    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [loading, setLoading] = useState(true);
    const [targetGuildId, setTargetGuildId] = useState('');
    const [durationMonths, setDurationMonths] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPartnerships = useCallback(async () => {
        if (!serverId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/partnerships/${serverId}`);
            if (res.ok) {
                const data = await res.json();
                setPartnerships(data);
            } else {
                throw new Error("Impossible de récupérer les partenariats.");
            }
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [serverId, toast]);

    useEffect(() => {
        fetchPartnerships();
    }, [fetchPartnerships]);

    const handleRequest = async () => {
        if (!targetGuildId) {
            toast({ title: "Erreur", description: "Veuillez entrer l'ID du serveur partenaire.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/partnerships/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guild1_id: serverId,
                    guild2_id: targetGuildId,
                    duration_months: durationMonths,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Une erreur est survenue.');
            toast({ title: "Succès", description: "Votre demande de partenariat a été envoyée." });
            setTargetGuildId('');
            setDurationMonths(undefined);
            fetchPartnerships();
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAccept = async (partnershipId: string) => {
        try {
            const res = await fetch(`${API_URL}/partnerships/accept/${partnershipId}`, { method: 'POST' });
             if (!res.ok) {
                 const errorData = await res.json();
                 throw new Error(errorData.message || "Impossible d'accepter le partenariat.");
             }
            toast({ title: "Succès", description: "Partenariat accepté !" });
            fetchPartnerships();
        } catch (error: any) {
             toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
    };

    const handleTerminate = async (partnershipId: string) => {
        try {
            const res = await fetch(`${API_URL}/partnerships/terminate/${partnershipId}`, { method: 'POST' });
            if (!res.ok) throw new Error("Impossible de terminer le partenariat.");
            toast({ title: "Succès", description: "Partenariat terminé." });
            fetchPartnerships();
        } catch (error: any) {
             toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
    };
    
    const pendingReceived = partnerships.filter(p => p.status === 'pending' && p.guild2_id === serverId);
    const pendingSent = partnerships.filter(p => p.status === 'pending' && p.guild1_id === serverId);
    const active = partnerships.filter(p => p.status === 'accepted');

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Handshake /> Partenariats</h1>
                <p className="text-muted-foreground mt-2">Créez des liens forts entre votre communauté et d'autres serveurs.</p>
            </div>
            <Separator />
            
             <Card>
                <CardHeader><CardTitle>Demander un nouveau partenariat</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <Label>ID du serveur partenaire</Label>
                            <Input placeholder="Entrez l'ID du serveur Discord" value={targetGuildId} onChange={e => setTargetGuildId(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                             <Label>Durée (en mois)</Label>
                            <Input type="number" placeholder="Laisser vide pour infini" value={durationMonths || ''} onChange={e => setDurationMonths(e.target.value ? parseInt(e.target.value) : undefined)} />
                        </div>
                    </div>
                     <Button onClick={handleRequest} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Envoyer la demande
                    </Button>
                </CardContent>
            </Card>

             {loading ? <PartnershipPageSkeleton /> : (
                <div className="space-y-8">
                     <Card>
                        <CardHeader><CardTitle>Demandes de partenariat reçues ({pendingReceived.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {pendingReceived.length === 0 ? <p className="text-muted-foreground">Aucune demande reçue pour le moment.</p> : pendingReceived.map(p => (
                                <PartnershipCard key={p.id} partnership={p} currentGuildId={serverId} onAccept={handleAccept} onTerminate={handleTerminate} />
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Partenariats actifs ({active.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                             {active.length === 0 ? <p className="text-muted-foreground">Aucun partenariat actif.</p> : active.map(p => (
                                <PartnershipCard key={p.id} partnership={p} currentGuildId={serverId} onAccept={handleAccept} onTerminate={handleTerminate} />
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Demandes envoyées ({pendingSent.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                             {pendingSent.length === 0 ? <p className="text-muted-foreground">Aucune demande en attente de réponse.</p> : pendingSent.map(p => (
                                <PartnershipCard key={p.id} partnership={p} currentGuildId={serverId} onAccept={handleAccept} onTerminate={handleTerminate} />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Alert>
                <Handshake className="h-4 w-4" />
                <AlertTitle>Prochainement...</AlertTitle>
                <AlertDescription>
                    La configuration des rôles à donner aux partenaires et aux membres des serveurs partenaires sera bientôt disponible ici.
                </AlertDescription>
            </Alert>
        </PageTransitionWrapper>
    );
}

function PartnershipCard({ partnership, currentGuildId, onAccept, onTerminate }: { partnership: Partnership; currentGuildId: string; onAccept: (id: string) => void; onTerminate: (id: string) => void; }) {
    const isRequester = partnership.guild1_id === currentGuildId;
    const partner = {
        name: isRequester ? partnership.guild2_name : partnership.guild1_name,
        icon: isRequester ? partnership.guild2_icon : partnership.guild1_icon,
    };
    const statusInfo = statusMap[partnership.status] || { text: "Inconnu", className: "bg-gray-500" };
    
    return (
        <Card className="bg-card/50">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={partner.icon || undefined} />
                        <AvatarFallback>{partner.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-lg">{partner.name || "Serveur Inconnu"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge className={statusInfo.className}>{statusInfo.text}</Badge>
                            <span>&#8226;</span>
                            {partnership.expires_at ? `Expire ${formatDistanceToNow(parseISO(partnership.expires_at), { addSuffix: true, locale: fr })}` : 'Partenariat à vie'}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {partnership.status === 'pending' && !isRequester && (
                         <>
                            <Button size="sm" variant="secondary" onClick={() => onTerminate(partnership.id)}>Refuser</Button>
                            <Button size="sm" onClick={() => onAccept(partnership.id)}><Check className="mr-2"/>Accepter</Button>
                        </>
                    )}
                     {partnership.status === 'pending' && isRequester && (
                        <Button size="sm" variant="destructive" onClick={() => onTerminate(partnership.id)}><X className="mr-2"/>Annuler</Button>
                     )}
                     {partnership.status === 'accepted' && (
                        <Button size="sm" variant="destructive" onClick={() => onTerminate(partnership.id)}><X className="mr-2"/>Terminer</Button>
                    )}
                </div>
            </CardContent>
             {partnership.status === 'accepted' && (
                <CardContent className="border-t border-border/50 pt-4 space-y-4">
                    <h4 className="font-semibold">Options du Partenariat</h4>
                    <div className="space-y-2 opacity-50">
                         <Label>Rôle à donner aux membres du serveur partenaire</Label>
                         <p className="text-xs text-muted-foreground">Bientôt disponible.</p>
                    </div>
                    <div className="space-y-2 opacity-50">
                         <Label>Rôle à donner au staff du serveur partenaire</Label>
                          <p className="text-xs text-muted-foreground">Bientôt disponible.</p>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
