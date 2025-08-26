
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

export function useAuthenticatedFetch() {
    const params = useParams();
    const serverId = params.serverId as string;
    const [authHeader, setAuthHeader] = useState('');

    useEffect(() => {
        const token = localStorage.getItem(`panel_token_${serverId}`);
        if (token) {
            setAuthHeader(`Bearer ${token}`);
        }
    }, [serverId]);

    const authenticatedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
        if (!authHeader) {
            // You might want to handle this case more gracefully, e.g., by throwing an error
            // or redirecting to a login page. For now, we reject the promise.
            return Promise.reject(new Error('Authentication token not available.'));
        }

        const newOptions = {
            ...options,
            headers: {
                ...options?.headers,
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        };

        return fetch(url, newOptions);
    }, [authHeader]);

    return { authenticatedFetch, isReady: !!authHeader };
}
