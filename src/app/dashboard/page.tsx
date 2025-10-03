
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRootPage() {
    const router = useRouter();

    useEffect(() => {
        const storedGuildIds = JSON.parse(localStorage.getItem('authed_guilds') || '[]');
        if (storedGuildIds.length > 0) {
            // Navigate to the first available server's dashboard
            router.push(`/dashboard/${storedGuildIds[0]}`);
        } else {
            // If no servers are authenticated, redirect to the main presentation page
            router.push('/');
        }
    }, [router]);

    // Return null or a loader while redirecting
    return null;
}
