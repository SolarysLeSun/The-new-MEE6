'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, BarChart2, Users, MessageSquare } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const mockData = [
  { name: '00:00', messages: 12, vocal: 5 },
  { name: '02:00', messages: 15, vocal: 8 },
  { name: '04:00', messages: 5, vocal: 2 },
  { name: '06:00', messages: 8, vocal: 1 },
  { name: '08:00', messages: 25, vocal: 3 },
  { name: '10:00', messages: 45, vocal: 6 },
  { name: '12:00', messages: 60, vocal: 10 },
  { name: '14:00', messages: 75, vocal: 15 },
  { name: '16:00', messages: 90, vocal: 22 },
  { name: '18:00', messages: 120, vocal: 25 },
  { name: '20:00', messages: 150, vocal: 30 },
  { name: '22:00', messages: 110, vocal: 18 },
];

export default function CommunityAnalysisPage() {
  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Analyse de Communauté
          <Badge className="bg-yellow-400 text-yellow-900">Premium</Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualisez l'activité de votre serveur pour mieux comprendre votre communauté.
        </p>
      </div>
      
      <Separator />

      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en cours de développement</AlertTitle>
        <AlertDescription>
          Ce module est en cours de construction. Les données ci-dessous sont des exemples et ne représentent pas l'activité réelle de votre serveur. Bientôt, vous pourrez visualiser ici les statistiques précises de votre communauté.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
            <CardTitle>Activité sur les dernières 24 heures</CardTitle>
            <CardDescription>Aperçu du volume de messages et de l'activité vocale.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={mockData}>
                    <defs>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                         <linearGradient id="colorVocal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.5rem',
                        }}
                    />
                    <Area type="monotone" dataKey="messages" name="Messages" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMessages)" />
                     <Area type="monotone" dataKey="vocal" name="Membres en vocal" stroke="#3498db" fillOpacity={1} fill="url(#colorVocal)" />
                </AreaChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
      
       <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Ratios Clés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Ratio membres / activité</span>
                        <span className="font-bold">12%</span>
                     </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ratio arrivées / départs (7j)</span>
                        <span className="font-bold text-green-400">+5</span>
                     </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                     <CardTitle className="flex items-center gap-2"><MessageSquare /> Top Salons (24h)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p># général</p>
                    <p># blabla</p>
                    <p># gaming</p>
                </CardContent>
            </Card>
        </div>
      
    </PageTransitionWrapper>
  );
}
