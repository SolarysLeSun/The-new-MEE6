
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
      if (!serverId) {
        throw new Error("Server ID is not available.");
      }

      const token = localStorage.getItem(`panel_token_${serverId}`);
      if (!token) {
        // This could redirect to a login/error page in a real app
        throw new Error("Authentication token not found.");
      }

      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      const body = options.body ? JSON.stringify(options.body) : undefined;

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle cases with no content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text();

    },
    [serverId]
  );

  return authenticatedFetch;
}

    