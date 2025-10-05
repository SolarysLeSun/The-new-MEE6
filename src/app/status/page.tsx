
'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, Loader2, ServerCrash, XCircle, AlertTriangle } from "lucide-react";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3630/api';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'loading';

interface StatusItem {
    name: string;
    status: ServiceStatus;
    description: string;
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

const StatusHistoryBar = ({ history, serviceName }: { history: StatusHistoryEntry[], serviceName: string }) => {
    return (
        <TooltipProvider>
            <div className="flex w-full h-8 rounded-lg bg-muted overflow-hidden">
                {history.map((entry, index) => {
                    const status = entry.statuses[serviceName];
                    const statusColor = {
                        operational: 'bg-green-500',
                        degraded: 'bg-yellow-500',
                        outage: 'bg-destructive',
                        loading: 'bg-muted-foreground',
                    }[status];
                    return (
                         <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn("flex-1 h-full transition-colors duration-300", statusColor)}
                                    style={{ flexBasis: `${100 / history.length}%`}}
                                />
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>{entry.time.toLocaleTimeString('fr-FR')}: {getStatusText(status)}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
};

export default function StatusPage() {
    const [services, setServices] = useState<StatusItem[]>([
        { name: "Panel Web", status: 'operational', description: "L'interface de configuration est accessible." },
        { name: "API & Bot Discord", status: 'loading', description: "Le cœur du bot qui interagit avec Discord." },
        { name: "Services Google AI", status: 'loading', description: "Les fonctionnalités d'intelligence artificielle." },
    ]);
    const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    useEffect(() => {
        const checkStatuses = async () => {
            let botApiStatus: ServiceStatus = 'operational';
            try {
                const response = await fetch(`${API_URL}/ping`);
                if (!response.ok) throw new Error('API response not OK');
                const data = await response.json();
                if (data.status !== 'ok') throw new Error('Invalid status from API');
            } catch (error) {
                console.error("Bot status check failed:", error);
                botApiStatus = 'outage';
            }
            
            // For now, Google AI services status is tied to the bot API status
            const googleAiStatus = botApiStatus;

            const newStatuses = {
                "Panel Web": 'operational',
                "API & Bot Discord": botApiStatus,
                "Services Google AI": googleAiStatus,
            };

            setServices([
                { name: "Panel Web", status: 'operational', description: "L'interface de configuration est accessible." },
                { name: "API & Bot Discord", status: botApiStatus, description: "Le cœur du bot qui interagit avec Discord." },
                { name: "Services Google AI", status: googleAiStatus, description: "Les fonctionnalités d'intelligence artificielle." },
            ]);
            
            setStatusHistory(prev => {
                const newEntry = { time: new Date(), statuses: newStatuses };
                // Keep only the last 24 entries
                return [newEntry, ...prev].slice(0, 24);
            });

            setLastChecked(new Date());
        };

        checkStatuses();
        const interval = setInterval(checkStatuses, 3600000); // Re-check every hour
        return () => clearInterval(interval);
    }, []);

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
                             service.status === 'degraded' && 'bg-yellow-500/10 text-yellow-400',
                             service.status === 'outage' && 'bg-destructive/10 text-destructive',
                             service.status === 'loading' && 'text-muted-foreground',
                         )}>
                            <StatusIndicator status={service.status} />
                           {getStatusText(service.status)}
                        </div>
                    </div>
                     <div className="pt-2">
                        <Label className="text-xs text-muted-foreground pb-2">Historique des 24 dernières heures</Label>
                        <StatusHistoryBar history={statusHistory} serviceName={service.name} />
                    </div>
                 </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </PageTransitionWrapper>
  );
}

  