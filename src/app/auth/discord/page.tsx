
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle, ExternalLink, BotMessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';

type Status = 'loading' | 'success' | 'error';

function AuthProcessor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('Vérification de votre session...');
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const supportServerUrl = "https://discord.gg/WSpz7FqFsC";

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token de connexion manquant.');
            setErrorDetails('Aucun token n\'a été trouvé dans l\'URL. Veuillez réessayer de vous connecter depuis la commande /login sur Discord.');
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

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Réponse invalide de l'API.' }));
                    throw new Error(errorData.error || 'Le token est invalide ou a expiré.');
                }

                const { guildId } = await response.json();
                const authedGuilds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
                if (!authedGuilds.includes(guildId)) {
                    authedGuilds.push(guildId);
                    localStorage.setItem('authed_guilds', JSON.stringify(authedGuilds));
                }

                setStatus('success');
                setMessage('Authentification réussie !');
                setTimeout(() => router.push(`/dashboard/${guildId}`), 1000);

            } catch (err: any) {
                setStatus('error');
                if (err.message.includes('fetch')) {
                    setMessage('Impossible de contacter le serveur du bot.');
                    setErrorDetails('Le bot est peut-être hors ligne ou en cours de redémarrage. Veuillez vérifier la page de statut ou réessayer dans quelques instants.');
                } else {
                    setMessage(err.message);
                    setErrorDetails('Ce lien de connexion a expiré ou est invalide. Veuillez générer un nouveau lien avec la commande `/login` sur votre serveur Discord.');
                }
            }
        };

        verifyToken();

    }, [searchParams, router]);

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-xl text-muted-foreground">{message}</p>
            </div>
        );
    }
    
    if (status === 'success') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-xl text-green-400">{message}</p>
                <p className="text-muted-foreground">Redirection vers votre tableau de bord...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                        <AlertTriangle className="w-10 h-10 text-destructive"/>
                    </div>
                    <CardTitle className="text-2xl pt-4">Erreur d'Authentification</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">{errorDetails}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Link href="/status" passHref className="w-full">
                        <Button variant="outline" className="w-full">
                            <BotMessageSquare className="mr-2"/>
                            Voir la page de statut
                        </Button>
                    </Link>
                    <a href={supportServerUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="secondary" className="w-full">
                             <ExternalLink className="mr-2"/>
                            Rejoindre le support Discord
                        </Button>
                    </a>
                </CardFooter>
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
