

'use client';
import type { ReactNode } from 'react';
import { ModuleSidebar } from '@/components/module-sidebar';
import { ServerSidebar } from '@/components/server-sidebar';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Menu, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelAlert } from '@/components/panel-alert';
import { CommandMenu } from '@/components/command-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WelcomeDialog } from '@/components/welcome-dialog';

const RippleGrid = dynamic(() => import('@/components/ripple-grid'), {
  ssr: false,
});

function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const serverId = params.serverId as string;
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If there's no serverId in the URL, we aren't loading, we're just waiting for user action.
    if (!serverId) {
      setLoading(false);
      setIsVerified(false);
      return;
    }

    const storedGuilds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
    
    if (storedGuilds.includes(serverId)) {
      setIsVerified(true);
    } else {
      console.warn(`Accès non autorisé refusé pour le serveur : ${serverId}. Redirection.`);
      router.push('/dashboard');
    }
    setLoading(false);
  }, [serverId, router]);

  if (loading) {
     return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
  }

  // If there's a server ID but it's not verified (e.g. during redirect) show loader.
  if (serverId && !isVerified) {
    return (
       <div className="flex h-full w-full items-center justify-center">
         <Loader2 className="w-12 h-12 animate-spin text-primary" />
       </div>
     );
  }

  // If there's no serverId, show a prompt to select a server.
  if (!serverId) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Card className="max-w-md text-center bg-card/80">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Server className="h-6 w-6"/>
                        Aucun Serveur Sélectionné
                    </CardTitle>
                    <CardDescription>
                        Veuillez sélectionner un serveur dans la barre latérale de gauche pour commencer la configuration.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  return <>{children}</>;
}


export default function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { serverId: string };
}) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0">
        <RippleGrid
            enableRainbow={true}
            gridColor="#2c3e50"
            rippleIntensity={0.07}
            gridSize={30}
            gridThickness={15}
            fadeDistance={1.5}
            vignetteStrength={2}
            glowIntensity={0.1}
            opacity={1}
            gridRotation={0}
            mouseInteraction={true}
            mouseInteractionRadius={0.5}
        />
      </div>
      <div className="relative z-10 flex h-full w-full">
        {/* --- Unified Mobile Sidebar --- */}
        <div className="md:hidden">
            <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent side="left" className="flex gap-0 p-0 w-full">
                    <ServerSidebar serverId={params.serverId} />
                    <ModuleSidebar serverId={params.serverId} onLinkClick={() => setMobileSidebarOpen(false)} isMobileView={true} />
                </SheetContent>
            </Sheet>
        </div>
        
        {/* --- Desktop Sidebars --- */}
        <div className="hidden md:flex">
            <ServerSidebar serverId={params.serverId} />
            <ModuleSidebar serverId={params.serverId} />
        </div>

        <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">
           <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                    <Menu className="h-6 w-6" />
                </Button>
                <CommandMenu />
              </div>
            </div>
          <div className="flex-1 container mx-auto p-6 lg:p-8 pt-0 md:pt-8">
             <WelcomeDialog />
             <PanelAlert />
             <AuthGuard>{children}</AuthGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
