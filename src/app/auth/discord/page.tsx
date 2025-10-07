
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, KeyRound, ServerCrash } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type AuthStatus = 'loading' | 'success' | 'token_error' | 'api_error';

function AuthProcessor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const supportServerUrl = "https://discord.gg/WSpz7FqFsC";

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('token_error');
            setErrorMessage('Token de connexion manquant dans l\'URL.');
            return;
        }

        const verifyToken = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiUrl}/verify-token`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });

                if (response.status === 401) {
                     setStatus('token_error');
                     setErrorMessage('Ce lien de connexion est invalide ou a expiré.');
                     return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `Le serveur a répondu avec une erreur ${response.status}.` }));
                    throw new Error(errorData.error);
                }

                const { guildId } = await response.json();

                const authedGuilds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
                if (!authedGuilds.includes(guildId)) {
                    authedGuilds.push(guildId);
                    localStorage.setItem('authed_guilds', JSON.stringify(authedGuilds));
                }
                
                setStatus('success');
                router.push(`/dashboard/${guildId}`);

            } catch (err: any) {
                // This block catches network errors (bot is down) or other unexpected errors
                console.error("API Verification Error:", err);
                setStatus('api_error');
                setErrorMessage(err.message || 'La communication avec le bot a échoué.');
            }
        };

        // Delay verification slightly to allow UI to render the loader
        setTimeout(verifyToken, 500);

    }, [searchParams, router]);

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-xl text-muted-foreground">Vérification de votre session...</p>
                <p className="text-sm text-muted-foreground">Connexion sécurisée au bot en cours.</p>
            </div>
        );
    }
    
    if (status === 'success') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-xl text-muted-foreground">Authentification réussie !</p>
                <p className="text-sm text-muted-foreground">Redirection vers votre tableau de bord...</p>
            </div>
        );
    }

    if (status === 'token_error') {
        return (
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                        <KeyRound className="h-6 w-6"/>
                        Lien de Connexion Invalide
                    </CardTitle>
                    <CardDescription>
                        {errorMessage}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Veuillez retourner sur votre serveur Discord et utiliser à nouveau la commande <code className="bg-muted px-1.5 py-1 rounded-md text-foreground">/login</code> pour générer un nouveau lien.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    if (status === 'api_error') {
         return (
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                        <ServerCrash className="h-6 w-6"/>
                        Le Bot ne répond pas
                    </CardTitle>
                    <CardDescription>
                        Impossible de se connecter à l'API du bot. Il est peut-être hors ligne ou en cours de redémarrage.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="text-muted-foreground">
                        Vous pouvez vérifier l'état actuel des services ou demander de l'aide sur notre serveur de support.
                    </p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/status">
                             <Button variant="outline" className="w-full">
                                Voir la page de statut
                            </Button>
                        </Link>
                         <a href={supportServerUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" className="w-full">
                                Rejoindre le support
                            </Button>
                        </a>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return null;
}


export default function DiscordAuthPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <Suspense fallback={<Loader2 className="w-12 h-12 animate-spin text-primary" />}>
                <AuthProcessor />
            </Suspense>
        </div>
    );
}
