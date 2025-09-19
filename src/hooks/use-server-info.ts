
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';

interface ServerInfo {
  id: string;
  name: string;
  icon: string | null;
  isPremium: boolean;
  channels: any[];
  roles: any[];
}

export function useServerInfo() {
  const params = useParams();
  const serverId = params.serverId as string;
  const authenticatedFetch = useAuthenticatedFetch();
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServerInfo = useCallback(async () => {
    if (!serverId) {
        setLoading(false);
        setError("No server ID provided.");
        return;
    };
    
    setLoading(true);
    setError(null);
    try {
        const data = await authenticatedFetch(`/get-server-details/${serverId}`);
        setServerInfo(data);
    } catch (err: any) {
        setError(err.message || "An unknown error occurred");
        setServerInfo(null);
    } finally {
        setLoading(false);
    }
  }, [serverId, authenticatedFetch]);


  useEffect(() => {
    fetchServerInfo();
  }, [fetchServerInfo]);

  return { serverInfo, loading, error, refetch: fetchServerInfo };
}
