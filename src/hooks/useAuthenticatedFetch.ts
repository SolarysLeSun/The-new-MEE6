
'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  body?: any;
};

export function useAuthenticatedFetch() {
  const params = useParams();
  const serverId = params.serverId as string;

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: FetchOptions = {}) => {
      const token = localStorage.getItem(`panel_token_${serverId}`);
      if (!token) {
        // This could redirect to a login page or handle the error appropriately
        throw new Error('Authentication token not found.');
      }

      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };

      if (options.body && typeof options.body !== 'string') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Invalid JSON response from server' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    [serverId]
  );

  return authenticatedFetch;
}
