
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, Loader2, ServerCrash, XCircle, AlertTriangle, MessageSquareWarning, Brain } from "lucide-react";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelAlert } from "@/components/panel-alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';
const HIGH_PING_THRESHOLD = 500; // ms

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'loading' | 'disabled';

interface StatusItem {
    name: string;
    status: ServiceStatus;
    description: string;
    ping?: number | null;
}

interface StatusHistoryEntry {
    time: Date;
    statuses: Record<string, ServiceStatus>;
}

const StatusIndicator = ({ status }: { status: ServiceStatus }) => {
    switch (status) {
        case 'operational':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'degraded':
        case 'disabled':
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
        case 'disabled':
            return "Désactivé par Admin";
    }
};

const StatusHistoryBar = ({ history, serviceName }: { history: StatusHistoryEntry[], serviceName: string }) => {
    const bars = Array.from({ length: 24 }).map((_, i) => {
        const entry = history[i];
        const status = entry ? (entry.statuses[serviceName] || 'loading') : 'loading';
        return { status, time: entry ? entry.time : null };
    }).reverse();

    return (
        <TooltipProvider>
            <div className="flex w-full h-8 rounded-lg bg-muted overflow-hidden">
                {bars.map((bar, index) => {
                    const statusColor = {
                        operational: 'bg-green-500',
                        degraded: 'bg-yellow-500',
                        disabled: 'bg-yellow-500',
                        outage: 'bg-destructive',
                        loading: 'bg-muted-foreground',
                    }[bar.status];
                    return (
                         <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn("flex-1 h-full transition-colors duration-300", statusColor)}
                                    style={{ flexBasis: `${100 / 24}%`}}
                                />
                            </TooltipTrigger>
                             <TooltipContent>
                                {bar.time ? (
                                    <p>{bar.time.toLocaleTimeString('fr-FR')}: {getStatusText(bar.status)}</p>
                                ) : (
                                    <p>Pas de données</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
};

function ReportProblemDialog() {
    const { toast } = useToast();
    const [report, setReport] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async () => {
        if (!report.trim()) {
            toast({ title: "Le rapport ne peut pas être vide.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/report-problem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: report }),
            });

            if (!response.ok) {
                throw new Error("Échec de l'envoi du rapport.");
            }

            toast({ title: "Rapport envoyé !", description: "Merci, le propriétaire du bot a été notifié." });
            setIsOpen(false);
            setReport("");
        } catch (error) {
            toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <MessageSquareWarning className="mr-2 h-4 w-4"/>
                    Signaler un problème
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Signaler un problème</DialogTitle>
                    <DialogDescription>
                        Décrivez brièvement le problème que vous rencontrez. Le propriétaire du bot sera notifié.
                    </DialogDescription>
                </DialogHeader>
                <Textarea 
                    placeholder="Ex: Le bot ne répond plus aux commandes sur mon serveur..."
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={4}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Envoyer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function StatusPage() {
    const [services, setServices] = useState<StatusItem[]>([
        { name: "Panel Web", status: 'operational', description: "L'interface de configuration est accessible." },
        { name: "API & Bot Discord", status: 'loading', description: "Le cœur du bot qui interagit avec Discord." },
        { name: "Services Google AI", status: 'loading', description: "Les fonctionnalités d'intelligence artificielle." },
    ]);
    const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
    const [eventLog, setEventLog] = useState<string[]>([]);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [titleClickCount, setTitleClickCount] = useState(0);
    const [showEasterEgg, setShowEasterEgg] = useState(false);

    const checkStatuses = useCallback(async () => {
        let botApiStatus: ServiceStatus = 'loading';
        let googleAiStatus: ServiceStatus = 'loading';
        let botApiPing: number | null = null;
    
        try {
            const startTime = Date.now();
            const botApiResponse = await fetch(`${API_URL}/ping`);
            const endTime = Date.now();
            botApiPing = endTime - startTime;

            if (botApiResponse.ok && (await botApiResponse.json()).status === 'ok') {
                botApiStatus = botApiPing > HIGH_PING_THRESHOLD ? 'degraded' : 'operational';
            } else {
                throw new Error('API response not OK');
            }
        } catch (error) {
            botApiStatus = 'outage';
        }
    
        try {
            const aiStatusResponse = await fetch(`${API_URL}/global-ai-status`);
            if (aiStatusResponse.ok) {
                const aiData = await aiStatusResponse.json();
                googleAiStatus = aiData.disabled ? 'disabled' : 'operational';
            } else {
                 googleAiStatus = botApiStatus === 'outage' ? 'outage' : 'degraded';
            }
        } catch (error) {
            googleAiStatus = botApiStatus === 'outage' ? 'outage' : 'degraded';
        }

        try {
             const logsResponse = await fetch(`${API_URL}/get-bot-logs`);
             if (logsResponse.ok) {
                 const { logs } = await logsResponse.json();
                 setEventLog(logs);
             }
        } catch (error) {
            // Don't change the main status if only logs fail
        }

        const newServices: StatusItem[] = [
            { name: "Panel Web", status: 'operational', description: "L'interface de configuration est accessible." },
            { name: "API & Bot Discord", status: botApiStatus, description: "Le cœur du bot qui interagit avec Discord.", ping: botApiPing },
            { name: "Services Google AI", status: googleAiStatus, description: "Les fonctionnalités d'intelligence artificielle." },
        ];
        
        setServices(newServices);
        
        setStatusHistory(prev => {
            const newStatuses = newServices.reduce((acc, service) => {
                acc[service.name] = service.status;
                return acc;
            }, {} as Record<string, ServiceStatus>);
            const newEntry = { time: new Date(), statuses: newStatuses };
            
            const lastEntry = prev[0];
            if (!lastEntry || JSON.stringify(lastEntry.statuses) !== JSON.stringify(newStatuses)) {
                return [newEntry, ...prev].slice(0, 24);
            }
            return prev;
        });

        setLastChecked(new Date());
    }, []);

    useEffect(() => {
        checkStatuses();
        const interval = setInterval(checkStatuses, 60 * 1000); // Re-check every minute
        return () => clearInterval(interval);
    }, [checkStatuses]);

    const overallStatus = services.some(s => s.status === 'outage') 
        ? 'outage' 
        : services.some(s => s.status === 'degraded' || s.status === 'disabled') 
        ? 'degraded' 
        : services.some(s => s.status === 'loading')
        ? 'loading'
        : 'operational';
        
    const handleTitleClick = () => {
        const newCount = titleClickCount + 1;
        setTitleClickCount(newCount);
        if (newCount >= 3) {
            setShowEasterEgg(true);
            setTitleClickCount(0);
        }
    };

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
        <PanelAlert />
        <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-white/10">
          <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <CardTitle className="text-4xl font-bold text-center sm:text-left cursor-pointer" onClick={handleTitleClick}>
                    Statut des Services
                </CardTitle>
                <ReportProblemDialog/>
            </div>
             <CardDescription className="text-center sm:text-left text-lg pt-4 space-y-2">
                <div className={cn(
                    "flex items-center justify-center sm:justify-start gap-2 font-semibold",
                    overallStatus === 'operational' && "text-green-400",
                    overallStatus === 'outage' && "text-destructive",
                    (overallStatus === 'degraded' || overallStatus === 'disabled') && "text-yellow-400",
                )}>
                   {overallStatus === 'operational' && <CheckCircle/>}
                   {overallStatus === 'outage' && <ServerCrash/>}
                   {(overallStatus === 'degraded' || overallStatus === 'disabled') && <AlertTriangle/>}
                   {overallStatus === 'loading' && <Loader2 className="animate-spin" />}
                   {getStatusText(overallStatus)}
                </div>
                 {lastChecked && <p className="text-xs text-muted-foreground">Dernière vérification : {lastChecked.toLocaleString('fr-FR')}</p>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            {services.map((service) => (
                 <div key={service.name} className="flex flex-col gap-4 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-lg text-white">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                         <div className={cn(
                             "flex items-center gap-2 text-sm font-medium rounded-full px-3 py-1",
                             service.status === 'operational' && 'bg-green-500/10 text-green-400',
                             (service.status === 'degraded' || service.status === 'disabled') && 'bg-yellow-500/10 text-yellow-400',
                             service.status === 'outage' && 'bg-destructive/10 text-destructive',
                             service.status === 'loading' && 'text-muted-foreground',
                         )}>
                            <StatusIndicator status={service.status} />
                           {getStatusText(service.status)}
                           {service.ping !== undefined && service.ping !== null && <span className="font-mono">({service.ping}ms)</span>}
                        </div>
                    </div>
                     <div className="pt-2">
                        <Label className="text-xs text-muted-foreground pb-2">Historique des dernières 24 heures (par heure)</Label>
                        <StatusHistoryBar history={statusHistory} serviceName={service.name} />
                    </div>
                 </div>
            ))}
             {showEasterEgg && (
                <div className="flex flex-col gap-4 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-lg text-white flex items-center gap-2"><Brain/>Cerveau du créateur</p>
                            <p className="text-sm text-muted-foreground">État mental du développeur principal.</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium rounded-full px-3 py-1 bg-yellow-500/10 text-yellow-400">
                            <StatusIndicator status="degraded" />
                            Surchauffe
                        </div>
                    </div>
                </div>
            )}
            <Separator/>
            <div className="p-4">
                 <CardTitle className="mb-4">Journal d'Événements</CardTitle>
                 <ScrollArea className="h-48 w-full rounded-md border p-4 bg-muted/30">
                    <div className="flex flex-col-reverse justify-end">
                    {eventLog.map((log, index) => (
                        <p key={index} className="font-mono text-sm text-muted-foreground">
                            {log}
                        </p>
                    ))}
                    </div>
                </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageTransitionWrapper>
  );
}
