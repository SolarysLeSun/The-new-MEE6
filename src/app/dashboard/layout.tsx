
'use client';
import type { ReactNode } from 'react';
import { ModuleSidebar } from '@/components/module-sidebar';
import { ServerSidebar } from '@/components/server-sidebar';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelAlert } from '@/components/panel-alert';
import { CommandMenu } from '@/components/command-menu';
import { useServerInfo } from '@/hooks/use-server-info';
import GradientText from '@/components/ui/gradient-text';

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
    if (!serverId) {
      router.push('/dashboard');
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

  if (!isVerified) {
     return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { serverInfo } = useServerInfo();

  return (
    <div className="relative flex h-screen bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0">
        <RippleGrid
            gridColor="#ffffff10"
            rippleIntensity={0.03}
            gridSize={25}
            fadeDistance={1}
            vignetteStrength={1.5}
        />
      </div>
      <div className="relative z-10 flex h-full w-full">
        {/* Barre latérale des serveurs pour les grands écrans */}
        <div className="hidden md:flex">
          <ServerSidebar serverId={params.serverId} />
        </div>
        
        {/* Barre latérale des modules (gérée différemment sur mobile/desktop) */}
        <ModuleSidebar serverId={params.serverId} isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">
           {/* Barre supérieure pour mobile */}
           <div className="sticky top-0 z-20 flex items-center justify-between p-2 bg-card/80 backdrop-blur-sm border-b border-border md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-6 w-6" />
              </Button>
              <div className="text-lg font-semibold">
                <GradientText>{serverInfo?.name || 'Dashboard'}</GradientText>
              </div>
              <CommandMenu />
            </div>

            {/* Barre supérieure pour grands écrans */}
            <div className="sticky top-0 z-20 hidden md:flex items-center justify-end p-4">
              <CommandMenu />
            </div>

          <div className="flex-1 container mx-auto p-6 lg:p-8 pt-0 md:pt-8">
             <PanelAlert />
             <AuthGuard>{children}</AuthGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
