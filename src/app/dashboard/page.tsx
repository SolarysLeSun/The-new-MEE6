
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardRootPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedGuildIds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
        if (storedGuildIds.length > 0) {
            // Navigate to the first available server's page
            router.push(`/dashboard/${storedGuildIds[0]}`);
        } else {
            // If no authenticated servers are found, redirect to the main presentation page.
            router.push('/');
        }
    }, [router]);

    // This component will likely redirect before ever showing anything,
    // but the loader is a good fallback.
    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
}
