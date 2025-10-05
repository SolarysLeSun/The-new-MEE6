
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/app-header';
import RippleGrid from '@/components/ripple-grid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

export default function BotRestartPage() {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleRestart = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/restart-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.status === 401) {
                throw new Error('Mot de passe incorrect.');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Le bot n'a pas pu redémarrer.");
            }
            
            toast({
                title: "Commande envoyée",
                description: "La commande de redémarrage a été envoyée au bot. Veuillez patienter une minute.",
                variant: 'default',
            });

        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setPassword('');
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground">
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

            <main className="relative z-10 container mx-auto flex items-center justify-center min-h-screen px-4">
                <PageTransitionWrapper>
                    <Card className="w-full max-w-md bg-card/60 backdrop-blur-sm border-white/10">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-fit bg-destructive/10 p-3 rounded-full border border-destructive/20">
                                <AlertTriangle className="w-10 h-10 text-destructive"/>
                            </div>
                            <CardTitle className="text-2xl pt-4">Zone de Haute Maintenance</CardTitle>
                            <CardDescription>
                                Cette action redémarrera le processus du bot. Utilisez-la uniquement en cas de problème majeur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe d'administration</Label>
                                <Input 
                                    id="password" 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button 
                                className="w-full" 
                                variant="destructive"
                                onClick={handleRestart}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                ) : (
                                    <Power className="mr-2 h-4 w-4"/>
                                )}
                                Lancer la procédure de redémarrage
                            </Button>
                        </CardContent>
                    </Card>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}
