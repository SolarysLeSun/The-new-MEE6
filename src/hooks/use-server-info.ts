

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthenticatedFetch } from './use-authenticated-fetch';

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

  useEffect(() => {
    if (!serverId || !authenticatedFetch) {
        setLoading(false);
        setError("Server ID or auth method not available.");
        return;
    };

    const fetchServerInfo = async () => {
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
    };

    fetchServerInfo();
  }, [serverId, authenticatedFetch]);

  return { serverInfo, loading, error };
}

    