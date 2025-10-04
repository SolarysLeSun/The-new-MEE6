'use client';

import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, Loader2, ServerCrash, XCircle } from "lucide-react";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'loading';

interface StatusItem {
    name: string;
    status: ServiceStatus;
    description: string;
}

const StatusIndicator = ({ status }: { status: ServiceStatus }) => {
    switch (status) {
        case 'operational':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'degraded':
            return <Circle className="h-5 w-5 text-yellow-500" />;
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
}

export default function StatusPage() {
    const [statuses, setStatuses] = useState<StatusItem[]>([
        { name: "Panel Web", status: 'operational', description: "L'interface de configuration est accessible." },
        { name: "API & Bot Discord", status: 'loading', description: "Le cœur du bot qui interagit avec Discord." },
    ]);

    useEffect(() => {
        const checkBotStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/ping`);
                if (!response.ok) {
                    throw new Error('API response not OK');
                }
                const data = await response.json();
                if (data.status !== 'ok') {
                     throw new Error('Invalid status from API');
                }
                setStatuses(prev => prev.map(s => s.name === "API & Bot Discord" ? { ...s, status: 'operational' } : s));
            } catch (error) {
                 console.error("Bot status check failed:", error);
                 setStatuses(prev => prev.map(s => s.name === "API & Bot Discord" ? { ...s, status: 'outage' } : s));
            }
        };

        checkBotStatus();
        const interval = setInterval(checkBotStatus, 60000); // Re-check every minute

        return () => clearInterval(interval);
    }, []);

    const overallStatus = statuses.some(s => s.status === 'outage') 
        ? 'outage' 
        : statuses.some(s => s.status === 'degraded') 
        ? 'degraded' 
        : statuses.some(s => s.status === 'loading')
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
             <CardDescription className="text-center text-lg pt-2">
                <div className={cn(
                    "flex items-center justify-center gap-2 font-semibold",
                    overallStatus === 'operational' && "text-green-400",
                    overallStatus === 'outage' && "text-destructive",
                    overallStatus === 'degraded' && "text-yellow-400",
                )}>
                   {overallStatus === 'operational' && <CheckCircle/>}
                   {overallStatus === 'outage' && <ServerCrash/>}
                   {getStatusText(overallStatus)}
                </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statuses.map((service) => (
                 <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                    <div>
                        <p className="font-semibold text-lg text-white">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                     <div className={cn(
                         "flex items-center gap-2 text-sm font-medium",
                         service.status === 'operational' && 'text-green-500',
                         service.status === 'degraded' && 'text-yellow-500',
                         service.status === 'outage' && 'text-destructive',
                         service.status === 'loading' && 'text-muted-foreground',
                     )}>
                        <StatusIndicator status={service.status} />
                       {getStatusText(service.status)}
                    </div>
                 </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </PageTransitionWrapper>
  );
}
