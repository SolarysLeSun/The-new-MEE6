

'use client';

import React, { useState, useCallback, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ServerCrash, XCircle, AlertTriangle, MessageSquareWarning, Cpu, Memory, Power } from "lucide-react";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'loading';

interface StatusItem {
    name: string;
    status: ServiceStatus;
    description: string;
    latency: number | null;
}

interface ClusterStatus {
    id: number;
    status: string;
    cpu: number;
    memory: string;
}

const LATENCY_DEGRADED_THRESHOLD = 500; // ms
const LATENCY_OUTAGE_THRESHOLD = 2000; // ms

const StatusIndicator = ({ status }: { status: ServiceStatus }) => {
    switch (status) {
        case 'operational':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'degraded':
            return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        case 'outage':
            return <XCircle className="h-5 w-5 text-destructive" />;
        case 'loading':
            return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
};

const getStatusText = (status: ServiceStatus) => {
    switch (status) {
        case 'operational':
            return "Opérationnel";
        case 'degraded':
            return "Performance Dégradée";
        case 'outage':
            return "Panne Majeure";
        case 'loading':
            return "Vérification...";
    }
};

const LatencyBadge = ({ latency, status }: { latency: number | null, status: ServiceStatus }) => {
    if (status === 'loading' || latency === null) {
        return <span className="text-xs text-muted-foreground">-- ms</span>;
    }
    const colorClass = latency > LATENCY_OUTAGE_THRESHOLD 
        ? 'text-destructive' 
        : latency > LATENCY_DEGRADED_THRESHOLD 
        ? 'text-yellow-400' 
        : 'text-green-400';

    return <span className={cn("text-sm font-mono", colorClass)}>{latency} ms</span>;
};

function ReportIssueDialog() {
    const { toast } = useToast();
    const [description, setDescription] = useState("");
    const [contact, setContact] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async () => {
        if (!description) {
            toast({
                title: "Description manquante",
                description: "Veuillez décrire le problème que vous rencontrez.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${BOT_API_URL}/report-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, contact }),
            });

            if (!response.ok) {
                throw new Error("Impossible d'envoyer le rapport.");
            }

            toast({
                title: "Rapport envoyé !",
                description: "Merci pour votre contribution. L'équipe a été notifiée.",
            });
            setIsOpen(false);
            setDescription("");
            setContact("");
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Une erreur est survenue lors de l'envoi du rapport.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full max-w-sm">
                    <MessageSquareWarning className="mr-2 h-4 w-4" />
                    Signaler un problème
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Signaler un problème</DialogTitle>
                    <DialogDescription>
                        Décrivez le problème que vous avez rencontré. Soyez aussi précis que possible.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Problème
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Ex: Le bot ne répond plus dans le salon #general..."
                            rows={5}
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contact" className="text-right">
                            Contact
                        </Label>
                        <Input
                            id="contact"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            className="col-span-3"
                            placeholder="Votre pseudo Discord (optionnel)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer le rapport
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function StatusPage() {
    const [services, setServices] = useState<StatusItem[]>([
        { name: "Votre Connexion > Panel", status: 'loading', description: "Latence entre votre navigateur et le panel web.", latency: null },
        { name: "Panel > API du Bot", status: 'loading', description: "Connectivité entre le panel et le bot Discord.", latency: null },
        { name: "Genkit & Services IA", status: 'loading', description: "État des services d'IA (Google Gemini).", latency: null },
        { name: "Service de Surveillance (Watchdog)", status: 'loading', description: "Surveille l'état de l'API du bot et la redémarre si nécessaire.", latency: null },
    ]);
    const [clusterStatus, setClusterStatus] = useState<ClusterStatus[]>([]);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const checkStatuses = useCallback(async () => {
        const newServices: StatusItem[] = [...services];
        const WATCHDOG_API_URL = `${window.location.protocol}//${window.location.hostname}:4400`;

        // 1. User -> Web Panel
        const userPanelService = newServices.find(s => s.name === "Votre Connexion > Panel")!;
        try {
            const startTime = performance.now();
            await fetch('/api/ping');
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            userPanelService.latency = latency;
            userPanelService.status = latency > LATENCY_DEGRADED_THRESHOLD ? 'degraded' : 'operational';
        } catch (e) {
            userPanelService.status = 'outage';
            userPanelService.latency = null;
        }

        // 2. Panel -> Bot API
        const panelBotService = newServices.find(s => s.name === "Panel > API du Bot")!;
        try {
            const startTime = performance.now();
            const response = await fetch(`${BOT_API_URL}/ping`);
            const endTime = performance.now();
            if (!response.ok) throw new Error();
            const latency = Math.round(endTime - startTime);
            panelBotService.latency = latency;
            panelBotService.status = latency > LATENCY_OUTAGE_THRESHOLD 
                ? 'outage'
                : latency > LATENCY_DEGRADED_THRESHOLD 
                ? 'degraded' 
                : 'operational';
        } catch (e) {
            panelBotService.status = 'outage';
            panelBotService.latency = null;
        }
        
        // 3. AI Services Status
        const aiService = newServices.find(s => s.name === "Genkit & Services IA")!;
        try {
            const response = await fetch(`${BOT_API_URL}/global-ai-status`);
            if (!response.ok) {
                aiService.status = panelBotService.status === 'outage' ? 'outage' : 'degraded';
                aiService.description = "Impossible de vérifier l'état des services IA.";
            } else {
                 const data = await response.json();
                 if (data.disabled) {
                    aiService.status = 'degraded';
                    aiService.description = `Désactivé par un admin : ${data.reason}`;
                 } else {
                    aiService.status = 'operational';
                    aiService.description = "Les services d'IA sont opérationnels.";
                 }
                 aiService.latency = panelBotService.latency;
            }

        } catch (e) {
            aiService.status = 'outage';
            aiService.description = "La connexion à l'API du bot a échoué.";
        }
        
        // 4. Watchdog Service
        const watchdogService = newServices.find(s => s.name === "Service de Surveillance (Watchdog)")!;
        try {
            const startTime = performance.now();
            const response = await fetch(`${WATCHDOG_API_URL}/health`);
            const endTime = performance.now();
            if (!response.ok) throw new Error();
            watchdogService.latency = Math.round(endTime - startTime);
            watchdogService.status = 'operational';
        } catch (e) {
            watchdogService.status = 'outage';
            watchdogService.latency = null;
        }

        // 5. Bot Cluster Status
        try {
            const response = await fetch(`${BOT_API_URL}/system-status`);
            if (!response.ok) throw new Error("Could not fetch cluster status");
            const data: ClusterStatus[] = await response.json();
            setClusterStatus(data);
        } catch (e) {
            setClusterStatus([]);
        }


        setServices(newServices);
        setLastChecked(new Date());
    }, []);

    useEffect(() => {
        checkStatuses();
        const interval = setInterval(checkStatuses, 30000); // Re-check every 30 seconds
        return () => clearInterval(interval);
    }, [checkStatuses]);

    const overallStatus = services.some(s => s.status === 'outage') 
        ? 'outage' 
        : services.some(s => s.status === 'degraded') 
        ? 'degraded' 
        : services.some(s => s.status === 'loading')
        ? 'loading'
        : 'operational';

  return (
    <PageTransitionWrapper className="relative min-h-screen w-full bg-background text-foreground">
      <div className="absolute inset-0 z-0">
        <RippleGrid
          gridColor="#ffffff10"
          rippleIntensity={0.03}
          gridSize={25}
          fadeDistance={1}
          vignetteStrength={1.5}
        />
      </div>

      <AppHeader />

      <main className="relative z-10 container mx-auto px-4 py-24 sm:py-32">
        <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-center">
              Statut des Services
            </CardTitle>
             <CardDescription className="text-center text-lg pt-4 space-y-2">
                <div className={cn(
                    "flex items-center justify-center gap-2 font-semibold",
                    overallStatus === 'operational' && "text-green-400",
                    overallStatus === 'outage' && "text-destructive",
                    overallStatus === 'degraded' && "text-yellow-400",
                )}>
                   {overallStatus === 'operational' && <CheckCircle/>}
                   {overallStatus === 'outage' && <ServerCrash/>}
                   {overallStatus === 'loading' && <Loader2 className="animate-spin" />}
                   {getStatusText(overallStatus)}
                </div>
                 {lastChecked && <p className="text-xs text-muted-foreground">Dernière vérification : {lastChecked.toLocaleString('fr-FR')}</p>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.map((service, index) => (
                 <React.Fragment key={service.name}>
                 <div className="flex flex-col sm:flex-row gap-4 justify-between p-4">
                    <div className="flex-1">
                        <p className="font-semibold text-lg text-white">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                     <div className="flex flex-col items-start sm:items-end gap-2">
                        <div className={cn(
                             "flex items-center gap-2 text-sm font-medium rounded-full px-3 py-1",
                             service.status === 'operational' && 'bg-green-500/10 text-green-400',
                             service.status === 'degraded' && 'bg-yellow-500/10 text-yellow-400',
                             service.status === 'outage' && 'bg-destructive/10 text-destructive',
                             service.status === 'loading' && 'text-muted-foreground',
                         )}>
                            <StatusIndicator status={service.status} />
                           {getStatusText(service.status)}
                        </div>
                        <LatencyBadge latency={service.latency} status={service.status} />
                     </div>
                 </div>
                 {index < services.length - 1 && <Separator />}
                 </React.Fragment>
            ))}
          </CardContent>
        </Card>
        
        {/* Cluster Status Card */}
        {clusterStatus.length > 0 && (
            <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-white/10 mt-8">
                <CardHeader>
                    <CardTitle>Statut du Cluster de Bot</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusterStatus.map((cluster) => (
                        <Card key={cluster.id} className="bg-background/50">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-base">
                                    <span>Cluster #{cluster.id}</span>
                                    <span className={cn("flex items-center gap-1.5 text-xs", cluster.status === 'online' ? 'text-green-400' : 'text-destructive')}>
                                        <Power className="w-3 h-3"/>
                                        {cluster.status}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-around text-sm">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-muted-foreground" />
                                    <span>{cluster.cpu}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Memory className="w-4 h-4 text-muted-foreground" />
                                    <span>{cluster.memory} Mo</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        )}

        <div className="max-w-4xl mx-auto text-center mt-8">
            <ReportIssueDialog />
        </div>
      </main>
    </PageTransitionWrapper>
  );
}
