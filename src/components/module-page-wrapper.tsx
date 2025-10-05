
'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ModuleDisabledAlert } from './module-disabled-alert';
import { cn } from '@/lib/utils';
import type { Module } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DisabledModulesStatus {
  [key: string]: {
    disabled: boolean;
    reason: string | null;
  };
}

export function ModulePageWrapper({
  moduleName,
  children,
}: {
  moduleName: Module;
  children: React.ReactNode;
}) {
  const [disabledModules, setDisabledModules] = useState<DisabledModulesStatus>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/disabled-modules`);
        if (res.ok) {
          const data = await res.json();
          setDisabledModules(data);
        }
      } catch (error) {
        console.error("Failed to fetch disabled modules status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return <Skeleton className="h-screen w-full" />;
  }
  
  const moduleStatus = disabledModules[moduleName];
  const isPermanentlyDisabled = moduleStatus?.disabled;

  return (
    <div>
      {isPermanentlyDisabled && <ModuleDisabledAlert reason={moduleStatus.reason} />}
      <div className={cn({ 'pointer-events-none opacity-50': isPermanentlyDisabled })}>
        {children}
      </div>
    </div>
  );
}
