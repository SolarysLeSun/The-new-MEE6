
'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone, AlertTriangle, Info, XCircle, Wrench } from 'lucide-react';
import type { PanelMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const alertConfig = {
    info: { icon: Info, className: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
    warning: { icon: AlertTriangle, className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" },
    error: { icon: XCircle, className: "bg-red-500/10 border-red-500/30 text-red-300" },
    urgent: { icon: AlertTriangle, className: "bg-red-700/20 border-red-600/40 text-red-400" },
    update: { icon: Wrench, className: "bg-green-500/10 border-green-500/30 text-green-300" },
    announcement: { icon: Megaphone, className: "bg-purple-500/10 border-purple-500/30 text-purple-300" }
};

export function PanelAlert() {
    const [message, setMessage] = useState<PanelMessage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const res = await fetch(`${API_URL}/get-panel-message`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.active) {
                        setMessage(data);
                    } else {
                        setMessage(null);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch panel message:", error);
                setMessage(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMessage();
        const interval = setInterval(fetchMessage, 300000); // Poll every 5 minutes

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <Skeleton className="h-16 w-full mb-6" />;
    }

    if (!message) {
        return null;
    }

    const config = alertConfig[message.type] || alertConfig.info;
    const Icon = config.icon;

    return (
        <div className="mb-6">
            <Alert className={cn("relative", config.className)}>
                <Icon className="h-4 w-4" />
                <AlertTitle className="font-bold">{message.type.charAt(0).toUpperCase() + message.type.slice(1)}</AlertTitle>
                <AlertDescription>
                    {message.content}
                </AlertDescription>
            </Alert>
        </div>
    );
}
